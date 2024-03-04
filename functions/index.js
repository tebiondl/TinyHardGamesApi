const functions = require("firebase-functions");
const express = require('express');
var unless = require('express-unless');
const cors = require('cors');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();
const app = express();

const validateFirebaseIdToken2 = async (req, res, next) => {
  
    if ((!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) &&
        !(req.cookies && req.cookies.__session)) {
      functions.logger.error(
        'No Firebase ID token was passed as a Bearer token in the Authorization header.',
        'Make sure you authorize your request by providing the following HTTP header:',
        'Authorization: Bearer <Firebase ID Token>',
        'or by passing a "__session" cookie.'
      );
      res.status(403).send('Unauthorized');
      return;
    }
  
    let idToken;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      // Read the ID Token from the Authorization header.
      idToken = req.headers.authorization.split('Bearer ')[1];
    } else if(req.cookies) {
      // Read the ID Token from cookie.
      idToken = req.cookies.__session;
    } else {
      // No cookie
      res.status(403).send('Unauthorized');
      return;
    }
  
    try {
      const decodedIdToken = await admin.auth().verifyIdToken(idToken);
      req.user = decodedIdToken;
      next();
      return;
    } catch (error) {
      functions.logger.error('Error while verifying Firebase ID token:', error);
      res.status(403).send('Unauthorized');
      return;
    }
};

app.use(cors({ origin: true }));
//app.use(validateFirebaseIdToken2);
//app.use(unless({path:['/updated']}));

app.post('/createUser', validateFirebaseIdToken2,async (req, res) => {
    const data = req.body;
    const snapshot = await db.collection('user').get();
    var id = 0;
    var validNick = true;

    if(snapshot.size != 0){
        snapshot.forEach(user => {
            if(user.data().uniqueId>id)
                id=user.data().uniqueId;
            if(user.data().nickName == data.nickName)
                validNick = false;
        });
        id++;
    }

    if(!validNick){
        res.status(403).send("Nick already existing");
        return;
    }

    const gamesNum = 4;

    const healthObject = {"health":5, "amount":0, "price":100, "increase": 25, "healthIncrease":1};
    const healths = [];
    for(i=0; i<gamesNum; i++){
        healths.push(healthObject);
    }
    
    const damageObject = {"damage":5, "amount":0, "price":200, "increase": 50, "damageIncrease":1};
    const damages = [];
    for(i=0; i<gamesNum; i++){
        damages.push(damageObject);
    }
    const attackSpeedObject = {"attackSpeed":1, "amount":0, "price":300, "increase": 75, "attackSpeedIncrease":0.1};
    const attackSpeeds = [];
    for(i=0; i<gamesNum; i++){
        attackSpeeds.push(attackSpeedObject);
    }

    var skins = [50];
    for(i=0; i<50; i++){
        skins[i] = 0;
    }
    skins[0] = 1;

    var missions = [];
    missions.push({"missionId":0, "progress": 0, "maxProgress": 20, "missionType": 0, "type": 0, "missionDesc": "Advance 1 round in Bullet Hell 20 times", "rewardAmount": 100})
    missions.push({"missionId":1, "progress": 0, "maxProgress": 20, "missionType": 1, "type": 0, "missionDesc": "Kill 20 bosses in Boss Battle", "rewardAmount": 100})
    missions.push({"missionId":2, "progress": 0, "maxProgress": 40, "missionType": 2, "type": 0, "missionDesc": "Kill 40 enemies in Shield Defense", "rewardAmount": 100})
    missions.push({"missionId":3, "progress": 0, "maxProgress": 40, "missionType": 0, "type": 1, "missionDesc": "Advance 1 round in Bullet Hell 40 times", "rewardAmount": 30})
    missions.push({"missionId":4, "progress": 0, "maxProgress": 40, "missionType": 1, "type": 1, "missionDesc": "Kill 40 bosses in Boss Battle", "rewardAmount": 30})
    missions.push({"missionId":5, "progress": 0, "maxProgress": 80, "missionType": 2, "type": 1, "missionDesc": "Kill 80 enemies in Shield Defense", "rewardAmount": 30})
    missions.push({"missionId":6, "progress": 0, "maxProgress": 60, "missionType": 0, "type": 0, "missionDesc": "Advance 1 round in Bullet Hell 60 times", "rewardAmount": 300})
    missions.push({"missionId":7, "progress": 0, "maxProgress": 60, "missionType": 1, "type": 0, "missionDesc": "Kill 60 bosses in Boss Battle", "rewardAmount": 300})
    missions.push({"missionId":8, "progress": 0, "maxProgress": 120, "missionType": 2, "type": 0, "missionDesc": "Kill 120 enemies in Shield Defense", "rewardAmount": 300})

    const finalData =  {"email": data.email, "nickName": data.nickName, "uniqueId": id, "coins": 0, "gems": 0, "skins": skins, "actualSkin": 0, "banned": 0, "iconId": 0, "healths": healths, "damages": damages, "attackSpeeds": attackSpeeds, "missions": missions, "missionsCompleted": 0};

    db.collection('user').add(finalData);

    res.status(201).send(JSON.stringify(finalData));
});

app.post('/updateUser', validateFirebaseIdToken2,async (req, res) => {
    const data = req.body;

    const finalData =  {"email":data.email, "nickName":data.nickName, "uniqueId":data.uniqueId, "coins": data.coins, "gems": data.gems,"healths": data.healths, "skins": data.skins, "actualSkin": data.actualSkin, "banned": data.banned, "iconId": data.iconId, "damages": data.damages, "attackSpeeds": data.attackSpeeds, "missions": data.missions};

    const users = await db.collection('user').where('uniqueId', '==', parseInt(data.uniqueId)).get();
    var finalUser;
    users.forEach(u => {
        if(u.data().uniqueId == data.uniqueId)
            finalUser = u;
    });
    functions.logger.log(finalUser);
    await finalUser.ref.update(finalData);

    res.status(201).send(JSON.stringify(finalData));
});

app.post('/addMissions',async (req, res) => {
    const data = req.body;

    const users = await db.collection('user').get();
    var finalData;

    var missionsCompleted = 0;
    var missions = [];
    //missionType -> 0 = rounds bullet hell, 1 = bosses boss battle, 2 = enemies shield defense, 3 = enemies boss battle, 4 = points bullet hell, 5 = Points in game bullet hell
    //6 = rounds in game bullet hell, 7 = sniper shield defense, 8 = shotgun shield defense, 9 = automatic rifle shield defense, 10 = bosses in game boss battle
    //11 = enemies in game shield defense
    //type -> 0 = coins, 1 = gems
    missions.push({"missionId":0, "progress": 0, "maxProgress": 20, "missionType": 0, "type": 0, "missionDesc": "Advance 1 round in Bullet Hell 20 times", "rewardAmount": 100})
    missions.push({"missionId":1, "progress": 0, "maxProgress": 20, "missionType": 1, "type": 0, "missionDesc": "Kill 20 bosses in Boss Battle", "rewardAmount": 100})
    missions.push({"missionId":2, "progress": 0, "maxProgress": 40, "missionType": 2, "type": 0, "missionDesc": "Kill 40 enemies in Shield Defense", "rewardAmount": 100})
    missions.push({"missionId":3, "progress": 0, "maxProgress": 40, "missionType": 0, "type": 1, "missionDesc": "Advance 1 round in Bullet Hell 40 times", "rewardAmount": 30})
    missions.push({"missionId":4, "progress": 0, "maxProgress": 40, "missionType": 1, "type": 1, "missionDesc": "Kill 40 bosses in Boss Battle", "rewardAmount": 30})
    missions.push({"missionId":5, "progress": 0, "maxProgress": 80, "missionType": 2, "type": 1, "missionDesc": "Kill 80 enemies in Shield Defense", "rewardAmount": 30})
    missions.push({"missionId":6, "progress": 0, "maxProgress": 60, "missionType": 0, "type": 0, "missionDesc": "Advance 1 round in Bullet Hell 60 times", "rewardAmount": 300})
    missions.push({"missionId":7, "progress": 0, "maxProgress": 60, "missionType": 1, "type": 0, "missionDesc": "Kill 60 bosses in Boss Battle", "rewardAmount": 300})
    missions.push({"missionId":8, "progress": 0, "maxProgress": 120, "missionType": 2, "type": 0, "missionDesc": "Kill 120 enemies in Shield Defense", "rewardAmount": 300})

    await users.forEach(u => {
        if(u.data().missions != null)
            finalData = { ...u.data(), missions, missionsCompleted};
            functions.logger.log(finalData);
            u.ref.update(finalData);
    });

    res.status(201).send();
});

app.post('/addMissionEveryone',async (req, res) => {
    const data = req.body;

    const users = await db.collection('user').get();
    const mission = await db.collection('mission').get();
    var finalData;
    var missionId;
    var finalMission;

    await mission.forEach(u => {
        missionId = u.data().missionId;
        finalMission = u;
    });

    missionId++;
    functions.logger.log(missionId);

    newMission = { ...data.mission, missionId};

    await users.forEach(u => {
        if(u.data().missions != null)
            finalData = u.data();
            finalData.missions.push(newMission)
            functions.logger.log(finalData);
            u.ref.update(finalData);
    });

    finalMission.ref.update({"missionId": missionId});
    res.status(201).send();
});

app.post('/addMissionTo',async (req, res) => {
    const data = req.body;

    const users = await db.collection('user').where("uniqueId", "==", parseInt(data.uniqueId)).get();
    const mission = await db.collection('mission').get();
    var finalData;
    var missionId;
    var finalMission;

    await mission.forEach(u => {
        missionId = u.data().missionId++;
        finalMission = u;
    });

    newMission = { ...data.mission, missionId};

    await users.forEach(u => {
        if(u.data().missions != null)
            finalData = u.data();
            finalData.missions.push(newMission);
            functions.logger.log(finalData);
            u.ref.update(finalData);
    });

    finalMission.ref.update(missionId);
    res.status(201).send();
});

app.post('/addMissionProgress', validateFirebaseIdToken2, async (req, res) => {
    const data = req.body;

    const users = await db.collection('user').where("uniqueId", "==", parseInt(data.uniqueId)).get();
    var finalData;
    var finalUser;

    await users.forEach(u => {
        if(u.data().missions != null)
            finalUser = u;
            finalData = u.data()
            finalData.missions.forEach(m => {
                if(m.missionId == data.missionId){
                    m.progress += parseInt(data.progress);
                }
            })    
    });

    functions.logger.log(finalData);
    finalUser.ref.update(finalData);

    res.status(201).send();
});

app.post('/completeMission', validateFirebaseIdToken2,async (req, res) => {
    const data = req.body;

    const users = await db.collection('user').where('uniqueId', '==', parseInt(data.uniqueId)).get();
    var finalUser;
    var finalData;
    users.forEach(u => {
        if(u.data().uniqueId == data.uniqueId)
            finalData = u.data()
            mission = -1;
            for (let i = 0; i < u.data().missions.length; i++) {
                if(finalData.missions[i].missionId == data.missionId){
                    if(finalData.missions[i].type == 0){
                        //coins
                        finalData.coins += finalData.missions[i].rewardAmount;
                    }else if(finalData.missions[i].type == 1){
                        //gems
                        finalData.gems += finalData.missions[i].rewardAmount;
                    }
                    mission = i;
                    finalData.missionsCompleted += 1;
                }
            }
            if(mission >= 0){
                finalData.missions.splice(mission, 1)
            }       
            finalUser = u;
    });

    functions.logger.log(finalData);
    await finalUser.ref.update(finalData);

    res.status(201).send();
});

app.post('/ban/:nickName',async (req, res) => {
    const name = req.params.nickName;
    const users = await db.collection('user').where('uniqueId', '==', parseInt(data.uniqueId)).get();
    var finalData;
    var finalUser;
    users.forEach(u => {
        if(u.data().nickName == name){
            finalUser = u;
            finalData = u.data();
            finalData.banned = 1;
            functions.logger.log(finalData.banned);
        }
    });
    
    finalUser.ref.update(finalData);
    res.status(201).send(JSON.stringify(finalData));
});

app.post('/changeIcon',async (req, res) => {
    const data = req.body;
    const users = await db.collection('user').where('uniqueId', '==', parseInt(data.uniqueId)).get();
    var finalData;
    var finalUser;
    users.forEach(u => {
        functions.logger.log(u.data().uniqueId);
        functions.logger.log(data.uniqueId);
        if(u.data().uniqueId == data.uniqueId){
            finalUser = u;
            finalData = u.data();
            finalData.iconId = data.iconId;
            functions.logger.log(finalData.iconId);
        }
    });
    
    finalUser.ref.update(finalData);
    res.status(201).send(JSON.stringify(finalData));
});

app.put('/addHealths',async (req, res) => {
    const health = req.body.health;
    const users = await db.collection('user').where('uniqueId', '==', parseInt(data.uniqueId)).get();
    var finalData;
    users.forEach(u => {
        finalData = u.data();
        finalData.healths.push(health);
        functions.logger.log(finalData.healths);
        u.ref.update(finalData);
    });
    
    res.status(201).send(JSON.stringify(finalData));
});

app.put('/addDamages',async (req, res) => {
    const damage = req.body.damage;
    const users = await db.collection('user').where('uniqueId', '==', parseInt(data.uniqueId)).get();
    var finalData;
    users.forEach(u => {
        finalData = u.data();
        finalData.damages.push(damage);
        functions.logger.log(finalData.damages);
        u.ref.update(finalData);
    });
    
    res.status(201).send(JSON.stringify(finalData));
});

app.put('/addAttackSpeeds',async (req, res) => {
    const attackSpeed = req.body.attackSpeed;
    const users = await db.collection('user').where('uniqueId', '==', parseInt(data.uniqueId)).get();
    var finalData;
    users.forEach(u => {
        finalData = u.data();
        finalData.attackSpeeds.push(attackSpeed);
        functions.logger.log(finalData.attackSpeeds);
        u.ref.update(finalData);
    });
    
    res.status(201).send(JSON.stringify(finalData));
});

app.put('/addSkins',async (req, res) => {
    const users = await db.collection('user').where('uniqueId', '==', parseInt(data.uniqueId)).get();
    var finalData;
    users.forEach(u => {
        finalData = u.data();
        finalData.skins.push(0);
        functions.logger.log(finalData.skins);
        u.ref.update(finalData);
    });
    
    res.status(201).send(JSON.stringify(finalData));
});

app.post('/equipSkin',async (req, res) => {
    const data = req.body;
    const users = await db.collection('user').where('uniqueId', '==', parseInt(data.uniqueId)).get();
    var finalData;
    var finalUser;
    users.forEach(u => {
        if(u.data().uniqueId == data.uniqueId){
            finalUser = u;
            finalData = u.data();
            finalData.actualSkin = data.actualSkin;
        }
    });

    functions.logger.log(finalData);
    
    await finalUser.ref.update(finalData);
    res.status(201).send(JSON.stringify(finalData));
});

app.post('/buyHealth', validateFirebaseIdToken2,async (req, res) => {
    const data = req.body;
    const users = await db.collection('user').where('uniqueId', '==', parseInt(data.uniqueId)).get();
    var newhealth;
    var finalUser;
    var finalData;
    users.forEach(u => {
        functions.logger.log(u.data().uniqueId);
        if(u.data().uniqueId == data.uniqueId){
            finalUser = u;
            finalData = u.data();
            var info = u.data().healths[data.gameId];
            if(u.data().coins >= (info.price + info.amount*info.increase)){   
                finalData.healths[data.gameId].health+=info.healthIncrease;
                finalData.coins -= (info.price + info.amount*info.increase);
                finalData.healths[data.gameId].amount++;
                newhealth = finalData.healths[data.gameId];
                functions.logger.log(finalData);
            }
            else{
                res.status(203).send("Not enough coins");
            }     
        }        
    });
    await finalUser.ref.update(finalData);
    res.status(201).send(newhealth);
});

app.post('/buyDamage', validateFirebaseIdToken2,async (req, res) => {
    const data = req.body;
    const users = await db.collection('user').where('uniqueId', '==', parseInt(data.uniqueId)).get();
    var newdamage;
    var finalUser;
    var finalData;
    users.forEach(u => {
        functions.logger.log(u.data().uniqueId);
        if(u.data().uniqueId == data.uniqueId){
            finalUser = u;
            finalData = u.data();
            var info = u.data().damages[data.gameId];
            if(u.data().coins >= (info.price + info.amount*info.increase)){   
                finalData.damages[data.gameId].damage+=info.damageIncrease;
                finalData.coins -= (info.price + info.amount*info.increase);
                finalData.damages[data.gameId].amount++;
                newdamage = finalData.damages[data.gameId];
                functions.logger.log(finalData);
            }
            else{
                res.status(203).send("Not enough coins");
            }     
        }        
    });
    await finalUser.ref.update(finalData);
    res.status(201).send(newdamage);
});

app.post('/buyAttackSpeed', validateFirebaseIdToken2,async (req, res) => {
    const data = req.body;
    const users = await db.collection('user').where('uniqueId', '==', parseInt(data.uniqueId)).get();
    var newattackspeed;
    var finalUser;
    var finalData;
    users.forEach(u => {
        functions.logger.log(u.data().uniqueId);
        if(u.data().uniqueId == data.uniqueId){
            finalUser = u;
            finalData = u.data();
            var info = u.data().attackSpeeds[data.gameId];
            functions.logger.log(info);
            if(u.data().coins >= (info.price + info.amount*info.increase)){   
                finalData.attackSpeeds[data.gameId].attackSpeed-=info.attackSpeedIncrease;
                finalData.coins -= (info.price + info.amount*info.increase);
                finalData.attackSpeeds[data.gameId].amount++;
                newattackspeed = finalData.attackSpeeds[data.gameId];
                functions.logger.log(finalData);
            }
            else{
                res.status(203).send("Not enough coins");
            }     
        }        
    });
    await finalUser.ref.update(finalData);
    res.status(201).send(newattackspeed);
});

app.post('/buyGems', validateFirebaseIdToken2,async (req, res) => {
    const data = req.body;
    const users = await db.collection('user').where('uniqueId', '==', parseInt(data.uniqueId)).get();
    var finalUser;
    var finalData;
    users.forEach(u => {
        functions.logger.log(u.data().uniqueId);
        if(u.data().uniqueId == data.uniqueId){
            finalUser = u;
            finalData = u.data();
            functions.logger.log(parseInt(data.gems));
            finalData.gems += parseInt(data.gems);   
        }        
    });
    await finalUser.ref.update(finalData);
    res.status(201).send();
});

app.post('/buySkin', validateFirebaseIdToken2,async (req, res) => {
    const data = req.body;
    const users = await db.collection('user').where('uniqueId', '==', parseInt(data.uniqueId)).get();
    var newSkin;
    var finalUser;
    var finalData;
    users.forEach(u => {
        functions.logger.log(u.data().uniqueId);
        if(u.data().uniqueId == data.uniqueId){
            finalUser = u;
            finalData = u.data();
            if(u.data().gems >= parseInt(data.price)){ 
                finalData.skins[data.skinId] = 1;
                finalData.gems -= parseInt(data.price);
                newSkin = finalData.skins;
                functions.logger.log(finalData);
            }
            else{
                res.status(203).send("Not enough coins");
            }     
        }        
    });
    await finalUser.ref.update(finalData);
    res.status(201).send(newSkin);
});

app.post('/giveCoins', validateFirebaseIdToken2,async (req, res) => {
    const data = req.body;
    const users = await db.collection('user').where('uniqueId', '==', parseInt(data.uniqueId)).get();
    var finalUser;
    var docId;
    users.forEach(u => {
        if(u.data().uniqueId == data.uniqueId){
            finalUser = u;
            docId = u.id;
            coins = finalUser.data().coins += parseInt(data.coins);
        }        
    });

    functions.logger.log("GIVE COINS: ")
    functions.logger.log(coins)
    for (let i = 0; i < 10; i++) {
        await finalUser.ref.update({"coins":coins});
    }
    
    await sleep(500);
    
    var finish = false;
    while(!finish){
        const user = await db.collection('user').doc(docId).get();
        if(user.data().coins < coins){
            await finalUser.ref.update({"coins":coins});
            await sleep(500);
        }else{
            finish = true;
        } 
    }

    res.status(201).send();
});

const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
  }

app.post('/checkUser', validateFirebaseIdToken2,async (req, res) => {
    const data = req.body;
    const snapshot = await db.collection('user').get();
    var haseEmail = false;
    var realUser;

    if(snapshot.size != 0){
        snapshot.forEach(user => {
            if(user.data().email == data.email){
                haseEmail = true;
                realUser = user.data();
            }
            
        });
    }

    if(!haseEmail){
        res.status(203).send("Does not have a nick");
        return;
    }else{
        res.status(201).send(JSON.stringify(realUser));
    }
});

app.post('/uploadUpdate', async (req, res) => {
    const data = req.body;
    db.collection('update').add(data);
    functions.logger.log(data);
    res.status(201).send(JSON.stringify(data));
});

app.get('/updated', async (req, res) => {
    const snapshot = await db.collection('update').get();

    var finalData = null;
    var data
    var id = 0;
    snapshot.forEach(update => {
        data = update.data();

        if(update.data().id > id){
            finalData = data;
        }
    });

    if(finalData == null)
        finalData = data;

    functions.logger.log(finalData);
    res.status(200).send(JSON.stringify(finalData));
});

app.post('/uploadScore', validateFirebaseIdToken2,async (req, res) => {
    const data = req.body;
    const finalData =  {"score":parseInt(data.score), "gameId":parseInt(data.gameId), "uniqueId":parseInt(data.uniqueId), "nickName":data.nickName};

    db.collection('score').add(finalData);

    res.status(201).send();
});

app.get('/allScores/:gameId', validateFirebaseIdToken2,async (req, res) => {
    const gameId = req.params.gameId;
    const snapshot = await db.collection('score').where('gameId', '==', parseInt(gameId)).orderBy('score','desc').limit(31).get();

    let scores = [];
    snapshot.forEach(score => {
        let id = score.id;
        let data = score.data();
        functions.logger.log("DATA");
        functions.logger.log(data);
        scores.push({ id, ...data });
    });

    functions.logger.log(scores);
    res.status(200).send(JSON.stringify(scores));
});

app.get('/allScoresSomeone/:uniqueId', validateFirebaseIdToken2,async (req, res) => {
    const uniqueId = req.params.uniqueId;
    const snapshot = await db.collection('score').where('uniqueId', '==', parseInt(uniqueId)).get();

    let scores = [];
    snapshot.forEach(score => {
        let id = score.id;
        let data = score.data();

        scores.push({ id, ...data });
    });

    res.status(200).send(JSON.stringify(scores));
});

app.get('/allScores', validateFirebaseIdToken2,async (req, res) => {
    const snapshot = await db.collection('score').get();

    let scores = [];
    snapshot.forEach(score => {
        let id = score.id;
        let data = score.data();

        scores.push({ id, ...data });
    });

    res.status(200).send(JSON.stringify(scores));
});

app.delete('/deleteScores/:uniqueId', validateFirebaseIdToken2,async (req, res) => {
    const uniqueId = req.params.uniqueId;
    const snapshot = await db.collection('score').where('uniqueId', '==', uniqueId).get();

    for (i = 0; i < snapshot.size; i++) {
        await db.collection('score').doc(snapshot[i].id).delete();
    }
    res.status(200).send();
});

exports.minigame = functions.region('europe-west1').https.onRequest(app);