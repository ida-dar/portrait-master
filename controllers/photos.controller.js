const Photo = require('../models/photo.model');
const Voter = require('../models/Voter.model');
const sanitize = require('mongo-sanitize');

/****** SUBMIT PHOTO ********/

exports.add = async (req, res) => {

  try {
    const { title, author, email } = req.fields;
    const file = req.files.file;

    const fileExt = file.path.split('/').slice(-1)[0].split('.').slice(-1)[0];

    const emailRegExp = new RegExp(/^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);

    if(title && (title.length <= 25) && 
      author && (author.length < 50) && 
      email && emailRegExp.test(email) && 
      file && (fileExt === new RegExp('jpg'|'png'|'gif'))
    ) { // if fields are not empty...

      const fileName = file.path.split('/').slice(-1)[0]; // cut only filename from full path, e.g. C:/test/abc.jpg -> abc.jpg
      
      const cleanTitle = sanitize(title);
      const cleanAuthor = sanitize(author);
      
      const newPhoto = new Photo({ cleanTitle, cleanAuthor, email, src: fileName, votes: 0 });
      await newPhoto.save(); // ...save new photo in DB
      res.json(newPhoto);

    } else {
      throw new Error('Wrong input!');
    }

  } catch(err) {
    res.status(500).json(err);
  }

};

/****** LOAD ALL PHOTOS ********/

exports.loadAll = async (req, res) => {

  try {
    res.json(await Photo.find());
  } catch(err) {
    res.status(500).json(err);
  }

};

/****** VOTE FOR PHOTO ********/

exports.vote = async (req, res) => {

  try {
    const photoToUpdate = await Photo.findOne({ _id: req.params.id });
    if(!photoToUpdate) res.status(404).json({ message: 'Not found' });
    
    else {
      const ip = req.clientIp;

      const voter = await Voter.findOne({ user: ip });

      if(!voter){
        const newVoter = new Voter({ user: ip, votes: [ photoToUpdate._id ] });
        await newVoter.save();
      } 
      else if(Voter.findOne({ user: ip, votes: photoToUpdate._id })){
        throw new Error('User already voted');
      }
      else {
        await Voter.updateOne({ user: ip }, { $push: { votes: photoToUpdate._id }} );
        photoToUpdate.votes++;
        photoToUpdate.save();
        res.send({ message: 'OK' });
      }
    }
  } 
  catch(err) {
    res.status(500).json(err.message);
  }

};
