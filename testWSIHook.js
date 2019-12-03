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
    console.log('resp='+resp)
    let jobj = xparser.parse(resp)
    mySessionID = jobj.LOGIN.ID
    console.log('mySessionID:'+mySessionID)     
    setEventStart()             
}

async function setEventStart(  ) {    
    let ant = config.maxNumbers ? config.maxNumbers : lokalnumre.numre.length
    if( ant > lokalnumre.numre.length ) ant = lokalnumre.numre.length
    let numlist = ''
    for(let np=0; np<ant; np++) {
        let num = lokalnumre.numre[np]
        if( np>0 ) numlist += ','
        numlist += ''+ num
    }
    console.log("Numlist: "+numlist)
    let resp = await request(baseuri+'?cmd=HookSubscribe&user='+config.extension+'&devices='+numlist+'&gsSession='+mySessionID)
        if( resp.search('local="false"') > 0 ) {  //Kan gøres bedre!
            console.log("FAILED!")
        }        
    
    setTimeout(getMsgs,200)
    console.log('Timer started')
}

function getMsgs() {        
    request(baseuri+'/GetEvents?deviceObject='+config.extension+'&gsSession='+mySessionID, (err,resp,body)=>{
        if( err) console.log('error:', err)

        if(body && (body.charAt(0)==='{'))  {
            let ev = JSON.parse(body)    
//            console.log( JSON.stringify(ev,null,2) ) 
            let ea = ev.events

            ea.forEach(e => {                
                if( e.type) {
                    //console.log(e.deviceID+"  e.type="+e.type)
                    if(e.type==='HookEvent') {                                            
                     //   console.log(e.jsonEvent)
                        e.jsonEvent.HookEvent.forEach(o=>{                        
                            console.log("HookEvent ext:"+o.deviceID+' '+o.hook+' '+o.inout+' '+o.intext)   
                        })
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
