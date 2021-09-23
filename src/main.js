import log from './utils/log'
import express from 'express'
import path from 'path'
import cors from 'cors'

log('info', 'Skeleton', 'Skeleton Loaded')

const app = express()

app.use(cors())

app.get('/', (req, res) => {
  res.send("Server side!")
})

var port = 3001;

app.listen(port, () => {
  log('info', 'Skeleton', `http://localhost:${port}`)
})

