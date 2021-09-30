import log from './utils/log'
import express from 'express'
import cors from 'cors'
import config from '../config.json'
import e from 'express'
import ws from 'ws'

var MongoClient = require("mongodb").MongoClient;
const app = express()

var wss = new ws.Server({ port: 40510 })

let channelDatabase

app.use(cors())
app.use(express.json());

const fourzerofour = (req, res) => {
    res.status(404).json({ error: "Not Found" });
    log('error', '', `Not found:      IP: ${req.headers['x-forwarded-for'] || req.socket.remoteAddress}    Address: ${req.originalUrl}`)
}

const fourzerozero = (req, res) => {
    res.status(400).json({ error: "Not Found" });
    log('error', '', `Bad Request:    IP: ${req.headers['x-forwarded-for'] || req.socket.remoteAddress}    Address: ${req.originalUrl}`)
}

wss.on('connection', function (ws) {
    ws.on('message', function (message) {
        log('info', 'INFO', 'Recieved Message: ' + message)
    })

    log('info', 'INFO', 'Client connected to ws.')
})

wss.broadcast = function broadcast(msg){
    wss.clients.forEach(function each(client){
      client.send(msg);
    });
  };

app.get("/api/channel", (req, res) => {
    channelDatabase.listCollections()
        .toArray()
        .then((collectionList) => collectionList.map(collection => collection.name))
        .then((collectionList) => collectionList.sort())
        .then((collectionList) => res.send(collectionList))
})

app.get("/api/channel/:channel", (req, res) => {
    channelDatabase.listCollections({ name: req.params.channel })
        .next(function (err, collinfo) {
            if (collinfo) {
                channelDatabase.collection(req.params.channel).find().sort({ "date": 1 }).toArray((err, result) => {
                    if (err) throw err
                    result.forEach(message => {
                        delete message["ip"]
                        delete message["_id"]
                    })
                    res.send(result)
                })
            }
            else fourzerofour(req, res)
        });
})

app.post("/api/login", (req, res) => {
    if (req.body.password === config.dashboardPassword) {
        log('info', 'INFO', `Logged In:       IP: ${req.headers['x-forwarded-for'] || req.socket.remoteAddress}`)
        res.send({ "password": config.dashboardPassword })
    }
    else {
        res.status(403).json({ error: "Invalid Password" });
        log('error', '', `Invalid Password: IP: ${req.headers['x-forwarded-for'] || req.socket.remoteAddress}    Password: ${req.body.password}`)
    }
})

app.post("/api/channel/:channel", (req, res) => {
    if (req.body) {
        if (req.body.content) {
            for (var key in req.body) if (!(key === "content" || key === "reply")) delete req.body[key]
            if (req.headers["sal-token"] === config.dashboardPassword) {
                req.body.bold = true
            }
            else {
                req.body.bold = false
                delete req.body.reply
            }
            req.body.ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress
            req.body.date = Math.floor(Date.now() / 1000)
            channelDatabase.collection(req.params.channel).insertOne(req.body, (err, result) => {
                if (err) throw err;
                channelDatabase.collection(req.params.channel).find().sort({ "date": 1 }).toArray((err, result) => {
                    if (err) throw err
                    result.forEach(message => {
                        delete message["ip"]
                        delete message["_id"]
                    })
                    res.send(result)
                })
                log('info', 'INFO', `Message posted:  IP: ${req.body.ip}    Content: ${req.body.content}    Channel: ${req.params.channel}    Bold: ${req.body.bold}.`)
            })
        }
        else fourzerozero(req, res)
    }
    else fourzerozero(req, res)
})

app.post("/api/channel/:channel/delete", (req, res) => {
    if (req.body) {
        if (req.body.content) {
            if (req.headers["sal-token"] === config.dashboardPassword) {
                delete req.body._id
                channelDatabase.collection(req.params.channel).deleteOne(req.body, (err, obj) => {
                    if (err) throw err;
                    if (obj.deletedCount === 0) {
                        fourzerofour(req, res)
                    }
                    else {
                        channelDatabase.collection(req.params.channel).find().sort({ "date": 1 }).toArray((err, result) => {
                            if (err) throw err
                            result.forEach(message => {
                                delete message["ip"]
                                delete message["_id"]
                            })
                            res.send(result)
                        })
                        log('info', 'INFO', `Message deleted: IP: ${req.headers['x-forwarded-for'] || req.socket.remoteAddress}    Content: ${req.body.content}    Channel: ${req.params.channel}.`)
                    }
                })
            }
            else {
                res.status(403).json({ error: "Invalid Password" });
                log('error', '', `Invalid Password: IP: ${req.headers['x-forwarded-for'] || req.socket.remoteAddress}    Password: ${req.body.password}`)
            }
        }
        else fourzerozero(req, res)
    }
    else fourzerozero(req, res)
})

app.post("/api/channel/:channel/edit", (req, res) => {
    if (req.body) {
        if (req.body.newContent && req.body.oldContent) {
            if (req.headers["sal-token"] === config.dashboardPassword) {
                delete req.body._id
                var newvalues = { $set: { "content": req.body.newContent } };
                channelDatabase.collection(req.params.channel).updateOne(req.body.oldContent, newvalues, (err, obj) => {
                    if (err) throw err;
                    if (obj.modifiedCount === 0) {
                        fourzerofour(req, res)
                    }
                    else {
                        channelDatabase.collection(req.params.channel).find().sort({ "date": 1 }).toArray((err, result) => {
                            if (err) throw err
                            result.forEach(message => {
                                delete message["ip"]
                                delete message["_id"]
                            })
                            res.send(result)
                        })
                        log('info', 'INFO', `Message deleted: IP: ${req.headers['x-forwarded-for'] || req.socket.remoteAddress}    Content: ${req.body.content}    Channel: ${req.params.channel}.`)
                    }
                })
            }
            else {
                res.status(403).json({ error: "Invalid Password" });
                log('error', '', `Invalid Password: IP: ${req.headers['x-forwarded-for'] || req.socket.remoteAddress}    Password: ${req.body.password}`)
            }
        }
        else fourzerozero(req, res)
    }
    else fourzerozero(req, res)
})

app.post("/api/channel/:channel/broadcast", (req, res) => {
    if (req.body) {
        if (req.body.content) {
            if (req.headers["sal-token"] === config.dashboardPassword) {
                wss.broadcast(JSON.stringify(req.body))
                log('info', 'INFO', 'Broadcasted message: ' + req.body.content)
                res.json({"status": true})
            }
            else {
                res.status(403).json({ error: "Invalid Password" });
                log('error', '', `Invalid Password: IP: ${req.headers['x-forwarded-for'] || req.socket.remoteAddress}    Password: ${req.body.password}`)
            }
        }
        else fourzerozero(req, res)
    }
    else fourzerozero(req, res)
})

MongoClient.connect(`mongodb://${config.mongo.username}:${config.mongo.password}@${config.mongo.url}:${config.mongo.port}/`, (err, db) => {
    if (err) throw err

    log('info', 'INFO', 'Connected to mongodb.')

    channelDatabase = db.db("channels")

    config.channels.forEach(channel => {
        channelDatabase.createCollection(channel, function (err, res) {
            if (err) log('info', 'INFO', 'Collection detected.')
            else log('info', 'INFO', 'Collection created.')
        })
    })

    var port = 3001;
    app.listen(port, () => {
        log('info', 'INFO', `Running on: http://localhost:${port}.`)
    })
})