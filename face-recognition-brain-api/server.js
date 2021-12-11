const express = require('express');
const bodyParser = require('body-parser'); // latest version of exressJS now comes with Body-Parser!
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const knex = require('knex');
const Clarifai=require('clarifai');
const { json } = require('body-parser');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0; 

const db = knex({
  // Enter your own database information here based on what you created
  client: 'pg',
  connection: {
    connectionString : process.env.DATABASE_URL,
    ssl:true
  }
});
const app = express();

app.use(cors())
app.use(bodyParser.json()); // latest version of exressJS now comes with Body-Parser!
const newApp = new Clarifai.App({
  apiKey: 'eaa6feb961574e2385c31b60d3554122'
 });

const handleApiCall =(req,res)=>{
    newApp.models
    .predict(Clarifai.FACE_DETECT_MODEL,req.body.input)
    .then(data=>{
      res.json(data);
    })
    .catch(err=>res.status(400).json('unable to catch the API'))
}
app.post('/imageurl',(req,res)=>{handleApiCall(req,res)})

app.get('/', (req, res)=> {
  res.send(db.users);
})

app.post('/signin', (req, res) => {
  const { email, password } = req.body;
  if(!email||!password){
    return res.status(400).json('incorect form submission')
  }
  db.select('email', 'hash').from('login')
    .where('email', '=', email)
    .then(data => {
      const isValid = bcrypt.compareSync(password, data[0].hash);
      if (isValid) {
        return db.select('*').from('users')
          .where('email', '=', email)
          .then(user => {
            res.json(user[0])
          })
          .catch(err => res.status(400).json('unable to get user'))
      } else {
        res.status(400).json('wrong credentials')
      }
    })
    .catch(err => res.status(400).json('wrong credentials'))
})

app.post('/register', (req, res) => {
  const { email, name, password } = req.body;
  if(!email||!name||!password){
    return res.status(400).json('incorect form submission')
  }
  const hash = bcrypt.hashSync(password);
    db.transaction(trx => {
      trx.insert({
        hash: hash,
        email: email
      })
      .into('login')
      .returning('email')
      .then(loginEmail => {
        return trx('users')
          .returning('*')
          .insert({
            email: loginEmail[0],
            name: name,
            joined: new Date()
          })
          .then(user => {
            res.json(user[0]);
          })
      })
      .then(trx.commit)
      .catch(trx.rollback)
    })
    .catch(err => res.status(400).json('unable to register'))
})

app.get('/profile/:id', (req, res) => {
  const { id } = req.params;
  db.select('*').from('users').where({id})
    .then(user => {
      if (user.length) {
        res.json(user[0])
      } else {
        res.status(400).json('Not found')
      }
    })
    .catch(err => res.status(400).json('error getting user'))
})

app.put('/image', (req, res) => {
  const { id } = req.body;
  db('users').where('id', '=', id)
  .increment('entires', 1)
  .returning('entires')
  .then(entires => {
    res.json(entires[0]);
  })
  .catch(err => res.status(400).json('unable to get entries'))
})
app.listen(process.env.PORT||3000, ()=> {
  console.log('app is running on port ${process.env.PORT}');
})
