//react-native
import { StyleSheet, Text, View, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import DesignButton from '../Components/DesignButton';
import Header from '../Components/Header';
import gun from '../lib/gun';
import Avatar from '../Components/Avatar';
import { forgetLogin, settleOnce } from '../lib/session';
import { pickPhoto } from '../lib/profile';
import { cleanProfile, BIO_MAX } from '../lib/profileData';
import common, { colors, fonts } from '../lib/styles';

function User({alias,navigation}){
    const [profile, setProfile] = useState(cleanProfile());
    // null shows the profile; "profile" and "password" show that form
    const [mode, setMode] = useState(null);
    const [form, setForm] = useState({});
    const [busy, setBusy] = useState(false);

    useEffect(() => {
      // the profile is in the user's own signed space, so only this user can change it
      const subscription = gun.user().get('profile').on((data) => setProfile(cleanProfile(data)));
      return () => subscription.off();
    }, []);

    const open = (next) => {
      setForm(next === "profile" ? { photo: profile.photo, bio: profile.bio } : { current: "", next: "", confirm: "" });
      setMode(next);
    }

    // Runs one GUN write and keeps the buttons off until GUN answers (or the timeout in settleOnce)
    const run = (label, start) => new Promise((resolve) => {
      let handled = false;
      const finish = settleOnce(resolve, label);
      start((res) => {
        // GUN can call back once per peer that acknowledges
        if(handled) { return }
        handled = true;
        if(res.err) { alert(res.err) } else { setMode(null) }
        finish();
      });
    });

    const save = async (label, start) => {
      setBusy(true);
      await run(label, start);
      setBusy(false);
    }

    const choosePhoto = async () => {
      try {
        const photo = await pickPhoto();
        if(photo) { setForm((current) => ({...current, photo})); }
      } catch (e) {
        alert("Could not read the photo: " + e.message);
      }
    }

    // null removes the photo from GUN
    const saveProfile = () => save("Profile save", (done) =>
      gun.user().get('profile').put({ photo: form.photo || null, bio: form.bio.trim() }, done));

    // SEA checks the current password, then stores the same key pair encrypted with the new one.
    // The pair does not change, so the login kept on this device (lib/session.js) still works.
    const changePassword = () => save("Password change", (done) =>
      gun.user().auth(alias, form.current, (res) => {
        if(!res.err) { alert("Password changed") }
        done(res);
      }, { change: form.next }));

    // GUN refuses passwords shorter than 8 characters (same rule as sign up)
    const passwordReady = form.current?.length > 0 && form.next?.length > 7 && form.next === form.confirm && form.next !== form.current;

    const LogoutBtn = async () => {
        // the kept login goes first: if it stayed, the next start would log in again
        try {
            await forgetLogin();
        } catch (e) {
            alert("Could not remove the saved login: " + e.message);
            return;
        }
        gun.user().leave();
        // the stack is the tab navigator's parent; reset it so Back cannot reopen the logged-out screens
        navigation.getParent().reset({ index: 0, routes: [{ name: 'Main' }] });
    }

    const input = (key, placeholder, options = {}) => (
      <TextInput style={[common.input, styles.input]} placeholder={placeholder} placeholderTextColor={colors.subtext}
        value={form[key]} onChangeText={(text) => setForm((current) => ({...current, [key]: text}))} autoCapitalize="none" {...options}/>
    );

    const buttons = (text, onPress, ready) => (
      <>
        <DesignButton text={busy ? "Please wait..." : text} disabled={busy || !ready} buttonFunction={onPress} width="80%" height={48} bgcolor={colors.primary} color={"white"} outline={false}/>
        <DesignButton text="Cancel" disabled={busy} buttonFunction={() => setMode(null)} width="80%" height={48} bgcolor={colors.primary} color={colors.primary} outline={true}/>
      </>
    );

    return(
        <KeyboardAvoidingView
    style = {{ flex: 1 }}
    behavior={Platform.OS === "ios" ? "padding" : null}>

    <Header left={<Text numberOfLines={1} style={common.headerTitle}>User Info</Text>}/>
    <View style={[common.home, styles.home]} >
      {mode === "profile" && <>
          <Text style={[common.label, styles.formTitle]}>EDIT PROFILE</Text>
          <Avatar photo={form.photo} name={alias} size={120}/>
          <DesignButton text="Change photo" disabled={busy} buttonFunction={choosePhoto} width="60%" height={40} bgcolor={colors.primary} color={colors.primary} outline={true}/>
          {form.photo && <DesignButton text="Remove photo" disabled={busy} buttonFunction={() => setForm((current) => ({...current, photo: null}))} width="60%" height={40} bgcolor={colors.accent} color={colors.accent} outline={true}/>}
          <View style={styles.gap}/>
          {input("bio", "About me", { maxLength: BIO_MAX, multiline: true, autoCapitalize: "sentences" })}
          {buttons("Save", saveProfile, true)}
      </>}
      {mode === "password" && <>
          <Text style={[common.label, styles.formTitle]}>CHANGE PASSWORD</Text>
          {input("current", "Current password", { secureTextEntry: true })}
          {input("next", "New password (8+ characters)", { secureTextEntry: true })}
          {input("confirm", "New password again", { secureTextEntry: true })}
          {buttons("Change password", changePassword, passwordReady)}
      </>}
      {mode === null && <>
          <View style={styles.avatar}>
            <Avatar photo={profile.photo} name={alias} size={120}/>
          </View>
          <Text style={[common.label, {marginTop:20}]}>SIGNED IN AS</Text>
          <Text style={[common.boldText, styles.Textsize2]}>{alias}</Text>
          {profile.bio !== "" && <Text style={styles.bio}>{profile.bio}</Text>}
          <DesignButton text="Edit profile" buttonFunction={() => open("profile")} width="60%" height={48} bgcolor={colors.primary} color={colors.primary} outline={true}/>
          <DesignButton text="Change password" buttonFunction={() => open("password")} width="60%" height={48} bgcolor={colors.primary} color={colors.primary} outline={true}/>
          <DesignButton text="Logout" buttonFunction={() => LogoutBtn()} width="60%" height={48} bgcolor={colors.primary} color={"white"} outline={false}/>
      </>}
    </View>
      </KeyboardAvoidingView>
)
}
export default User;


const styles = StyleSheet.create({
    home:{
      justifyContent: "flex-start",
    },
    Textsize2:{
      fontSize:26,
      fontFamily:fonts.serif,
      marginTop:6,
      marginBottom:16
    },
    bio:{
      color:colors.subtext,
      marginTop:6,
      marginBottom:8,
      textAlign:"center",
      width:"80%",
    },
    formTitle:{
      marginTop:"12%",
      marginBottom:16,
    },
    gap:{
      height:16,
    },
    input:{
      width:"80%",
      marginBottom:12,
    },
    avatar:{
      marginTop:"12%",
    },
  });
