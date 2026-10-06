//react-native
import { Text, View, TouchableOpacity,KeyboardAvoidingView, Touchable, Platform, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { Header } from 'react-native-elements';
import axios from 'axios';
import NotificationList from './notificationlist';
import common, { colors } from '../lib/styles';

function Notification({alias,password,pair,navigation}){
    const [roomState, setRoom] = useState("");

    const [roomenterinfo, setRoomenterInfo] = useState({
      enterroompostID:"",
      enterroomnumber:"",
    });

    useEffect(() => {
      notification()
  }, [])

    const notification=()=>{
      axios.get(`http://localhost:1206/api/queryallrecords`, {
        }).then((res) => {
          const Roomnotification=[];
          res.data.map((records) => {
          {records.Record.Function==="invitation"?
            Roomnotification.push([records.Record.HostID,records.Record.RoomNumber]):
            <></>
          }
          setRoomenterInfo(Roomnotification)
          })
        }).catch((err) => {
          console.log("notification: "+err.message)
        })
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
        {roomenterinfo && <Text>roomenterinfo.enterroomnumber</Text>!==""?
              <>
              {console.log("→"+JSON.stringify(roomenterinfo))}
              {Object.values(roomenterinfo).map((value,idx) => (<><NotificationList key={idx} value={value} navigation={navigation} alias={alias} pair={pair} /></>))}
              </>:
              <> </>
            }
        </ScrollView>
      </KeyboardAvoidingView>
)
}
export default Notification;