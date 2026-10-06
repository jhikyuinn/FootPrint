import { StyleSheet } from 'react-native';

export const colors = {
  background: "#6c7bb8",
  panel: "#c7cff0",
};

export default StyleSheet.create({
  home:{
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    width:"100%",
    height:"100%"
  },
  row:{
    flexDirection:"row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  input:{
    height:40,
    marginRight:10,
    padding: 10,
    borderRadius:10,
  },
  boldText:{
    color:"black",
    fontWeight: 'bold'
  },
  alarm:{
    width:"100%",
    borderBottomWidth: 2,
    padding: 10,
  },
  alarmText:{
    fontSize:18,
    marginBottom:"3%",
    color:"black",
    fontWeight: 'bold'
  },
});
