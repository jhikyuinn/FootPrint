//react-native
import { Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { Header } from 'react-native-elements';
import axios from 'axios';
import { API_URL } from '../lib/config';
import { acceptRoomKey, openSealedKey } from '../lib/secretRoom';
import NotificationList from './notificationlist';
import common, { colors } from '../lib/styles';

// Pending invitations sent to this user, read again every time the tab is opened
function Notification({alias,pair,navigation}){
    const [invites, setInvites] = useState([]);

    useEffect(() => {
      load()
      return navigation.addListener('focus', load)
    }, [navigation])

    const load=()=>{
      axios.get(`${API_URL}/api/invitations/${encodeURIComponent(alias)}`).then((res) => {
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
        if(!(await acceptRoomKey(invite.RoomNumber, key, pair))) { alert("This invitation's room key does not match the room."); return }
      }
      try {
        await axios.post(`${API_URL}/api/invitation/respond`, {
          RoomNumber: invite.RoomNumber,
          To: alias,
          Status: accepted ? "accepted" : "declined",
        })
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
