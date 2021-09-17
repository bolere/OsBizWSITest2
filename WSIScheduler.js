"use strict";

const request = require('request-promise-native').defaults({ rejectUnauthorized: false })
const xparser = require('fast-xml-parser')
const config = require('./config.json')
const schedule = require('node-schedule')
const baseuri = config.systemURI + '/cgi-bin/gadgetapi'
var mySessionID = ""

log('Started...')


let natschedule = schedule.scheduleJob('0-59 * * * *' , async function(){
    log("Setting night service")
    await login()
    await setNightService()
    await logout()    
}) 


async function login() {        
    let resp = await request(baseuri+'?cmd=Login&gsUser='+config.extension+'&gsPass='+config.password)        
    let jobj = xparser.parse(resp)
    mySessionID = jobj.LOGIN.ID
    log('mySessionID:'+mySessionID)         
}


async function setNightService() {
    let res = await request(baseuri+'?cmd=MakeCall&callingDevice='+config.extension+'&calledDirectoryNumber=*44*&gsSession='+mySessionID)        
    if(res.search('ERROR') > 0 ) {
        log('failed setting night service error:'+res)
    } else {
        log("Night service set");
    }
}


async function clearNightService() {    
    let res =  await request(baseuri+'?cmd=MakeCall&callingDevice='+config.extension+'&calledDirectoryNumber=%2344&gsSession='+mySessionID)
    if(res.search('ERROR') > 0 ) {
        log('failed clearing night service error:'+res)
    } else {
        log("Night service cleared");
    }
}


process.on('SIGTERM', ()=>{
    console.log('SIGTERM Received.')
    logout()
})


process.on('SIGINT', ()=>{
    console.log('SIGINT Received.')
    logout()
})


async function logout() {    
    let lr = await request(baseuri+'?cmd=Logout&gsSession='+mySessionID)    
    log('Logged out') 
    //process.exit()
}


function log(s) {
   let d = new Date()
   console.log(d.toLocaleString()+ " -> "+s)
}