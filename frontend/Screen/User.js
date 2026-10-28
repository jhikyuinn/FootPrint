//react-native
import { StyleSheet, Text, View, KeyboardAvoidingView, Platform } from 'react-native';
import DesignButton from '../Components/DesignButton';
import Header from '../Components/Header';
import gun from '../lib/gun';
import { forgetLogin } from '../lib/session';
import common, { colors, fonts } from '../lib/styles';

function User({alias,navigation}){
    
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

    return(
        <KeyboardAvoidingView 
    style = {{ flex: 1 }}
    behavior={Platform.OS === "ios" ? "padding" : null}>

    <Header left={<Text numberOfLines={1} style={common.headerTitle}>User Info</Text>}/>
    <View style={[common.home, styles.home]} >
          <View style={styles.avatar}>
            <Text style={styles.initial}>{(alias || "?").charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={[common.label, {marginTop:20}]}>SIGNED IN AS</Text>
          <Text style={[common.boldText, styles.Textsize2]}>{alias}</Text>
          <DesignButton text="Logout" buttonFunction={() => LogoutBtn()} width="60%" height={48} bgcolor={colors.primary} color={"white"} outline={false}/>
        
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
      marginBottom:32
    },
    avatar:{
      marginTop:"12%",
      width:120,
      height:120,
      borderRadius:60,
      backgroundColor:colors.primary,
      alignItems:"center",
      justifyContent:"center",
    },
    initial:{
      fontSize:56,
      fontFamily:fonts.serif,
      color:colors.background,
    },
  });