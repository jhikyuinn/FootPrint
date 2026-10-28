import { StyleSheet, Text, View, TextInput,KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import DesignButton from '../Components/DesignButton'
import gun from '../lib/gun';
import { rememberLogin, restoreLogin, settleOnce } from '../lib/session';
import Logo from '../Components/Logo';
import common, { colors, fonts } from '../lib/styles';

const timer = () => {
  let current = Date.now();
  return () => {
    const res = `${(Date.now() - current) / 1000} seconds`;
    current = Date.now();
    return res;
  };
};

function Main({navigation}) {
  const [userForm, setUserForm] = useState({
    alias: "",
    password: "",
  });
  // GUN rejects a create/auth that starts while another one is still running
  const [busy, setBusy] = useState(false);
  // GUN refuses passwords shorter than 8 characters
  const formReady = (userForm.alias).length > 0 && (userForm.password).length > 7;

  // A login kept on this device opens the app without the form (#11); the buttons wait, since GUN refuses a second auth meanwhile
  useEffect(() => {
    setBusy(true);
    restoreLogin().then((ok) => {
      if(ok) { navigation.reset({ index: 0, routes: [{ name: "Menu" }] }); } else { setBusy(false); }
    }).catch((e) => {
      console.log('restore login: ' + e.message);
      setBusy(false);
    });
  }, [])

  // SEA does all its crypto through the hidden <CryptoBridge /> in App.js. If that WebView
  // never answers, sign up and login wait forever, so check it once at start.
  useEffect(() => {
    const started = Date.now();
    let answered = false;
    crypto.subtle.digest({name: 'SHA-256'}, new Uint8Array([1, 2, 3])).then(() => {
      answered = true;
      console.log('[crypto] WebView answered in ' + (Date.now() - started) + ' ms');
    }).catch((e) => {
      answered = true;
      console.log('[crypto] WebView error: ' + e);
      alert("Crypto error: " + e);
    });
    const check = setTimeout(() => {
      if(!answered) {
        console.log('[crypto] WebView did not answer within 10 s');
        alert("The crypto WebView is not answering.\nSign up and login cannot finish.");
      }
    }, 10000);
    return () => clearTimeout(check);
  }, [])

  const createUser = () => 
    new Promise((resolve) => {
        const finish = settleOnce(resolve, "Sign up");
        gun.user().create(userForm.alias, userForm.password, async res => {
            // wait for the account to be created before telling the user to log in
            if(res.err) {
              alert(res.err)
            } else {
              alert("Hello "+userForm.alias + "\nLogin now")
            }
            finish();
        })
    })


  const authUser = () =>
    new Promise((resolve) => {
        const alias = userForm.alias;
        const password = userForm.password;
        let handled = false;
        const finish = settleOnce(resolve, "Login");
        gun.user().auth(alias, password, async res => {
            // GUN can call back more than once (for example with a write ack)
            if(handled) { return }
            handled = true;
            try {
              if(res.err) {
                alert(res.err);
                return;
              }
              const pair = res.sea || gun.user()._.sea;
              if(!pair) {
                alert("Login finished without a key pair");
                return;
              }
              // a failed save only means the next start asks for the password again
              await rememberLogin(alias, pair).catch((e) => console.log('remember login: ' + e.message));
              // the screens read the user from GUN's session (lib/session.js), so nothing secret is passed on.
              // reset, not navigate: this screen (and the password in its form) is dropped, and Back cannot return to it
              navigation.reset({ index: 0, routes: [{ name: "Menu" }] });
            } catch (e) {
              alert("Login error: " + e.message);
            } finally {
              finish();
            }
        })
    })

  

  const signUpBtn = async () => {
    const getElapsed = timer();
    setBusy(true);
    await createUser();
    setBusy(false);
    console.log('created', getElapsed());
  }

  const loginBtn = async () => {
    const getElapsed = timer();
    setBusy(true);
    await authUser();
    setBusy(false);
    console.log('authenticated', getElapsed());
  }

  const onChangeHandler = (keyValue, e) => {
    setUserForm({
      ...userForm,
      [keyValue]: e,
    })
  }

  return(
    <KeyboardAvoidingView 
    style = {{ flex: 1 }}
    behavior={Platform.OS === "ios" ? "padding" : null}>
    <View style={common.home}>
      <View style={styles.row}>
    <Logo size={84} />
    <Text style={[common.boldText, styles.title]}>Foot Print</Text>
    <Text style={common.label}>CHAT · RECORD · VERIFY</Text>
    </View>
    <TextInput  style={[common.input, styles.input, {marginBottom:12}]} type="text" placeholder="ID" placeholderTextColor={colors.subtext} autoCapitalize="none" name="alias" value={userForm.alias} onChangeText={(e) => onChangeHandler("alias", e)}/>
    <TextInput  style={[common.input, styles.input, {marginBottom:20}]} type="password" placeholder="Password (8+ characters)" placeholderTextColor={colors.subtext} value={userForm.password} name="password" secureTextEntry={true} onChangeText={(e) => onChangeHandler("password", e)}/>
    <DesignButton text={busy ? "Please wait..." : "Login"} disabled={busy || !formReady} buttonFunction={() =>loginBtn()} width="80%" height={48} bgcolor={colors.primary} color={"white"} outline={false} />
    <DesignButton text="SignUp" disabled={busy || !formReady} buttonFunction={() => signUpBtn()} width="80%" height={48} bgcolor={colors.primary} color={colors.primary} outline={true} />
  </View>
  </KeyboardAvoidingView>
    
    )
}

export default Main;
const styles = StyleSheet.create({
  title:{
    fontSize:38,
    fontFamily: fonts.serif,
    marginTop:14,
    marginBottom:6,
  },
  input: {
    width:"80%",
  },
  row:{
    width:"80%",
    marginBottom:36,
    alignItems: "center",
  },
});