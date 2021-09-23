import log from './utils/log'
import express from 'express'
import cors from 'cors'
import config from '../config.json'

var MongoClient = require("mongodb").MongoClient;
const app = express()

let channelDatabase

app.use(cors())
app.use(express.json());
app.use(function(e, req, res, next) {
    if (e.message === "Bad request") {
        res.status(400).json({error: {msg: e.message, stack: e.stack}});
    }
});

app.get('/api', (req, res) => {
    res.send("Server side")
})

app.get("/api/channel", (req, res) => {
    channelDatabase.listCollections()
        .toArray()
        .then((collectionList) => collectionList.map(collection => collection.name))
        .then((collectionList) => res.send(collectionList))
})

app.get("/api/channel/:channel", (req, res) => {
    channelDatabase.listCollections()
        .toArray()
        .then((collectionList) => collectionList.filter(collection => req.params.channel === collection.name))
        .then((collectionList) => collectionList.map(collection => collection.name))
        .then((collectionList) => res.send(collectionList))
})

app.post("/api/channel/:channel", (req, res) => {
    if (req.body) {
        if (req.body == Object) {
            for (var key in req.body) if (!(key === "content" || key === "time")) delete req.body[key]
            req.body.ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress 
            channelDatabase.collection("customers").insertOne(req.body, function(err, res) {
                if (err) throw err;
                res.send("Sent Sucessfully")
                log('info', 'Server', `Message posted. IP: ${req.body.ip}, Content: ${req.body.content}, ID: ${res._id}`)
            });
        }
        else throw new Error("Bad request")
    }
    else throw new Error("Bad request")
})

app.patch("/api/channel/:channel", (req, res) => {
    if (req.body) {
        if (req.body == Object) {
            for (var key in req.body) if (!(key === "delete")) delete req.body[key]
            req.body.ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress 
            channelDatabase.collection("customers").insertOne(req.body, function(err, res) {
                if (err) throw err;
                res.send("Sent Sucessfully")
            });
        }
        else throw new Error("Bad request")
    }
    else throw new Error("Bad request")
})

app.all('*', function(req, res) {
    throw new Error("Bad request")
})

MongoClient.connect(`mongodb://${config.mongo.username}:${config.mongo.password}@${config.mongo.url}:${config.mongo.port}/`, function (err, db) {
    if (err) throw err

    log('info', 'Server', 'Connected to mongodb')

    channelDatabase = db.db("channels")

    config.channels.forEach(channel => {
        channelDatabase.createCollection(channel, function (err, res) {
            if (err) log('info', 'Server', 'Collection detected.')
            else log('info', 'Server', 'Collection created.')
        })
    })

    var port = 3001;
    app.listen(port, () => {
        log('info', 'Server', `Running on: http://localhost:${port}`)
    })
})