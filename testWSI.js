"use strict";

const request = require('request-promise-native').defaults({ rejectUnauthorized: false })
const xparser = require('fast-xml-parser')
const config = require('./config.json')
const lokalnumre = require('./lokalnumre.json')

console.log('Running...')


var baseuri = config.systemURI + '/cgi-bin/gadgetapi'
var mySessionID = ""

loginA()

async function loginA() {        
    let resp = await request(baseuri+'?cmd=Login&gsUser='+config.extension+'&gsPass='+config.password)    
    //console.log('resp='+resp)
    let jobj = xparser.parse(resp)
    mySessionID = jobj.LOGIN.ID
    console.log('mySessionID:'+mySessionID)     
    setEventStart()             
}

async function setEventStart(  ) {    
    let ant = config.maxNumbers ? config.maxNumbers : lokalnumre.numre.length
    for(let np=0; np<ant; np++) {
        let num = lokalnumre.numre[np]
        console.log('SetEventStart ext='+num)
        let resp = await request(baseuri+'?cmd=EventStart&deviceObject='+num+'&filter=HOOKSTATE&gsSession='+mySessionID)        
        if( resp.search('local="false"') > 0 ) {  //Kan gøres bedre!
            console.log("FAILED!")
        }        
    }
    setTimeout(getMsgs,200)
    console.log('Timer started')
}

function getMsgs() {        
    request(baseuri+'/GetEvents?deviceObject=202&gsSession='+mySessionID, (err,resp,body)=>{
        if( err) console.log('error:', err)

        if(body && (body.charAt(0)==='{'))  {
            let ev = JSON.parse(body)    
            console.log( JSON.stringify(ev,null,2) ) 

            let ea = ev.events
      //      console.log("Number of events: "+ea.length)
            ea.forEach(e => {                
                if( e.type) {
                   // console.log("e.type="+e.type)

                    if(e.type === 'ServiceInitiatedEvent') {
                        let ext = e.deviceID
                        console.log(''+ext+' Busy')
                    }
                    if(e.type === 'DeliveredEvent') {
                        let ext = e.deviceID
                        console.log(''+ext+' Ringing')
                    }
                    if(e.type === 'ConnectionClearedEvent') {
                        let ext = e.deviceID
                        console.log(''+ext+' Free')
                    }
                }                         
            });
        } else {
            console.log( 'body illegal or empty: '+body ) 
            if( body.indexOf('NOT_LOGGED_IN') != -1) {
                console.log('BYEEEEEE!!!')
                process.exit()
            }
        }
        setTimeout(getMsgs,200)
    })
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
    console.log('Logged out '+lr) 
    process.exit()
}