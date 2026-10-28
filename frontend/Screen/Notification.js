//react-native
import { Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { Header } from 'react-native-elements';
import axios from 'axios';
import { API_URL } from '../lib/config';
import { saveRoomKey, openSealedKey } from '../lib/secretRoom';
import { signed } from '../lib/ledger';
import NotificationList from './notificationlist';
import common, { colors } from '../lib/styles';

// Pending invitations sent to this user, read again every time the tab is opened
function Notification({alias,pair,navigation}){
    const [invites, setInvites] = useState([]);

    useEffect(() => {
      load()
      return navigation.addListener('focus', load)
    }, [navigation])

    // invitations are kept by public key, and only its owner's signature can list them (#35)
    const load=async()=>{
      const { signed: proof } = await signed({ List: pair.pub }, pair)
      axios.get(`${API_URL}/api/invitations/${encodeURIComponent(pair.pub)}`, { params: { signed: proof } }).then((res) => {
        setInvites(res.data.filter((invite) => invite.Status === "pending"))
      }).catch((err) => {
        console.log("notification: "+err.message)
      })
    }

    // Accepting an encrypted room's invitation opens the room key it carries and keeps it for this user
    const answer=async(invite, accepted)=>{
      if(accepted && invite.Key) {
        const key = await openSealedKey(invite.Key, invite.FromEpub, pair)
        if(!key) { alert("This invitation's room key could not be opened."); return }
        await saveRoomKey(invite.RoomNumber, key, pair)
      }
      try {
        await axios.post(`${API_URL}/api/invitation/respond`, await signed({
          RoomNumber: invite.RoomNumber,
          Status: accepted ? "accepted" : "declined",
        }, pair))
      } catch(err) {
        alert("Invitation: "+err.message)
        return
      }
      setInvites((current) => current.filter((item) => item !== invite))
      if(accepted) {
        navigation.navigate("Chat", { room: invite.RoomNumber })
      }
    }

    return(
        <KeyboardAvoidingView
    style = {{ flex: 1 , backgroundColor:colors.background}}
    behavior={Platform.OS === "ios" ? "padding" : null}>

    <Header
        backgroundColor={colors.background}
        containerStyle={common.header}
        leftComponent={{text:"Notification",style:common.headerTitle}}
        />
        <ScrollView contentContainerStyle={{paddingHorizontal:20,paddingTop:8}}>
          {invites.length === 0 ?
            <Text style={{color:colors.subtext, marginTop:8}}>No invitations.</Text> :
            invites.map((invite) => <NotificationList key={invite.RoomNumber} invite={invite} onAnswer={answer} />)
          }
        </ScrollView>
      </KeyboardAvoidingView>
)
}
export default Notification;
