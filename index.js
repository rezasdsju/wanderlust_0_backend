import express from 'express'
import { MongoClient, ObjectId } from 'mongodb';
import cors from 'cors'
import 'dotenv/config'
import { createRemoteJWKSet, jwtVerify } from 'jose';
const app = express()
app.use(cors())
app.use(express.json())
const port = 5000
const client = new MongoClient(process.env.MONGODB_URI);
export async function connectToMongoDB() {
    try {
        await client.connect()
        console.log("You successfully connected to MongoDB!");
        return client
    } catch (error) {
        console.dir(error)
    }
}
const mongoClient = await connectToMongoDB()
const db = mongoClient.db('wanderlust')
const destinationCollection = db.collection('destination')
const bookingCollection = db.collection("bookings")

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization
    if (!authHeader) {
        return res.status(401).send({ 'msg': 'Unauthorized' })
    }
    // console.log(authHeader)
    const token = authHeader.split(' ')[1]
    // console.log(token)
    if (!token) {
        return res.status(401).send({ 'msg': 'Unauthorized' })
    }

    const JWKS = createRemoteJWKSet(new URL(`${process.env.CLIENT_URL}/api/auth/jwks`))
    try {
        const { payload } = await jwtVerify(token, JWKS)
        console.log(payload)
    } catch (error) {
        return res.status(401).send({ 'msg': 'server error' })
    }

    next()
}
app.post('/bookings', async (req, res) => {
    const result = await bookingCollection.insertOne(req.body)
    res.send(result)
})
app.get('/my-bookings/:email', async (req, res) => {
    const { email } = req.params
    const result = await bookingCollection.find({ email: email }).toArray()
    res.send(result)
})
app.delete('/my-bookings/:id', async (req, res) => {
    const id = req.params.id
    const result = await bookingCollection.deleteOne({ _id: id })
    res.send(result)
})
app.get('/', (req, res) => {
    res.send('Hello Server')
})
app.post('/add-destination',verifyToken, async (req, res) => {
    const data = req.body
    // console.log(data)
    const result = await destinationCollection.insertOne(data)
    res.send(result)
})
app.get('/destinations', async (req, res) => {
    const result = await destinationCollection.find().toArray()
    res.send(result)
})
app.get('/featured-destinations',async(req,res)=>{
    const result = await destinationCollection.find().limit(5).toArray()
    res.send(result)
})
app.get('/destinations/:id', verifyToken, async (req, res) => {
    const id = { _id: new ObjectId(req.params.id) }

    const result = await destinationCollection.findOne(id)
    res.send(result)
})
app.patch('/destinations/:id',verifyToken, async (req, res) => {
    const { id } = req.params
    if (!ObjectId.isValid(id)) {
        return res.status(400).send({ message: 'Invalid destination id' })
    }
    // const {_id, ...data} = req.body
    const { _id, ...data } = req.body
    console.log(req.body)
    const result = await destinationCollection.updateOne({ _id: new ObjectId(id) }, { $set: data })
    if (result.matchedCount === 0) {
        return res.status(404).send({ message: 'Destination not found' })
    }
    res.send(result)
})
app.delete('/destinations/:id', async (req, res) => {
    const { id } = req.params
    if (!ObjectId.isValid(id)) {
        return res.status(400).send({ message: 'Invalid destination id' })
    }
    const result = await destinationCollection.deleteOne({ _id: new ObjectId(id) })
    if (result.deletedCount === 0) {
        return res.status(404).send({ message: 'Destination not found' })
    }
    res.send(result)
})
app.listen(port, () => {
    console.log(`Server is running on port: ${port}`)
})

export default app