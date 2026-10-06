import CryptoBridge from '../lib/cryptoBridge';
import { StyleSheet, Image,Text, View, TextInput,KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage'
import DesignButton from '../Components/DesignButton'
import gun from '../lib/gun';
import common from '../lib/styles';

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
  const [alias, setAlias] = useState('');
  // GUN rejects a create/auth that starts while another one is still running
  const [busy, setBusy] = useState(false);
  // GUN refuses passwords shorter than 8 characters
  const formReady = (userForm.alias).length > 0 && (userForm.password).length > 7;

  const clearStorage = () => {
    AsyncStorage.clear();
  };

  // SEA does all its crypto through the hidden <CryptoBridge /> below. If that WebView
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

  useEffect(() => {
    if(gun.user().is) {
        gun.user(gun.user().is.pub).once((res) => {
            setAlias(res.alias);
        });
    }
  }, [])

  const createUser = () => 
    new Promise((resolve, reject) => {
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
    new Promise((resolve, reject) => {
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
              setAlias(alias);
              navigation.navigate("Menu", {
                  alias: alias,
                  password: password,
                  pair: pair,
              });
            } catch (e) {
              alert("Login error: " + e.message);
            } finally {
              finish();
            }
        })
    })

  // Releases the buttons when GUN answers, or after a minute if it never does.
  const settleOnce = (resolve, label) => {
    let done = false;
    const timeout = setTimeout(() => {
      if(done) { return }
      done = true;
      alert(label + " did not finish.\nReload the app before trying again.");
      resolve(false);
    }, 60000);
    return () => {
      if(done) { return }
      done = true;
      clearTimeout(timeout);
      resolve(true);
    };
  }
  

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
    <CryptoBridge />
    <View style={common.home}>
      <View style={[common.row, styles.row]}>
    <Text style={[common.boldText, styles.title]}>Foot Print {"\n"}{"\n"}</Text>
    <Image style={styles.image} source={require("../assets/footprint.png")} />
    </View>
    <TextInput  style={[common.input, styles.input, {marginBottom:"5%"}]} type="text" placeholder="ID" name="alias" value={userForm.alias} onChangeText={(e) => onChangeHandler("alias", e)}/>
    <TextInput  style={[common.input, styles.input, {marginBottom:"10%"}]} type="password" placeholder="Password (8+ characters)" value={userForm.password} name="password" secureTextEntry={true} onChangeText={(e) => onChangeHandler("password", e)}/>
    <DesignButton text={busy ? "Please wait..." : "Login"} disabled={busy || !formReady} buttonFunction={() =>loginBtn()} width="60%" height={40} bgcolor="white" color={"black"} outline={false} />
    <DesignButton text="SignUp" disabled={busy || !formReady} buttonFunction={() => signUpBtn()} width="60%" height={40} bgcolor="white" color={"black"} outline={false} />
  </View>
  </KeyboardAvoidingView>
    
    )
}

export default Main;
const styles = StyleSheet.create({
  image:{
    width:50,
    height: 50,
  },
  title:{
    fontSize:40,
  },
  input: {
    color:"black",
    borderBottomWidth: 2,
    borderStyle: 'solid',
    width:"60%",
  },
  row:{
    width:"80%",
    height:"14%",
    marginBottom:"10%",
    justifyContent: "center",
  },
});