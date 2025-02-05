const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const cors = require('cors');
const app = express();
const port = 3030;

app.use(cors());
app.use(require('body-parser').urlencoded({ extended: false }));

const reviews_data = JSON.parse(fs.readFileSync('reviews.json', 'utf8'));
const dealerships_data = JSON.parse(fs.readFileSync('dealerships.json', 'utf8'));

mongoose.connect('mongodb://mongo_db:27017/', { dbName: 'dealershipsDB' });

const Reviews = require('./review');
const Dealerships = require('./dealership');

try {
  Reviews.deleteMany({}).then(() => {
    Reviews.insertMany(reviews_data['reviews']);
  });
  Dealerships.deleteMany({}).then(() => {
    Dealerships.insertMany(dealerships_data['dealerships']);
  });
} catch (error) {
  console.error('Error initializing database:', error);
}

// Mock database functions. Replace these with your actual database access code.
const databaseFunction = {
  fetchAllDealers: async () => {
    return await Dealerships.find(); // Fetch all dealers from the database
  },
  fetchDealersByState: async (state) => {
    return await Dealerships.find({ state: state }); // Fetch dealers by state from the database
  },
  fetchDealerById: async (id) => {
    return await Dealerships.findById(id); // Fetch a dealer by ID from the database
  },
  fetchDealerByDealerNumericId: async (id) => {
    return await Dealerships.findOne({ id: id }); // Fetch a dealer by numeric ID from the database
  }
};

// Express route to home
app.get('/', async (req, res) => {
  res.send('Welcome to the Mongoose API');
});

// Express route to fetch all reviews
app.get('/fetchReviews', async (req, res) => {
  try {
    const documents = await Reviews.find();
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching documents' });
  }
});

// Express route to fetch reviews by a particular dealer
app.get('/fetchReviews/dealer/:id', async (req, res) => {
  try {
    const documents = await Reviews.find({ dealership: req.params.id });
    res.json(documents);
  } catch (error) {
    console.error('Error fetching reviews for dealer with ID ' + req.params.id + ':', error);
    res.status(500).json({ error: 'Error fetching documents' });
  }
});

// Express route to fetch all dealerships
app.get('/fetchDealers', async (req, res) => {
  try {
    const dealers = await databaseFunction.fetchAllDealers();
    res.json(dealers);
  } catch (error) {
    console.error('Error fetching dealers:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Express route to fetch Dealers by a particular state
app.get('/fetchDealers/:state', async (req, res) => {
  const { state } = req.params;
  try {
    const dealers = await databaseFunction.fetchDealersByState(state);
    res.json(dealers);
  } catch (error) {
    console.error(`Error fetching dealers in ${state}:`, error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Express route to fetch dealer by a particular id
app.get('/fetchDealer/:id', async (req, res) => {
    const { id } = req.params;
  
    // Check if the ID is numeric and handle appropriately
    if (!mongoose.Types.ObjectId.isValid(id) && isNaN(id)) {
      return res.status(400).json({ message: 'Invalid dealer ID' });
    }
  
    try {
      let dealer;
      if (mongoose.Types.ObjectId.isValid(id)) {
        dealer = await databaseFunction.fetchDealerById(id);
      } else {
        dealer = await databaseFunction.fetchDealerByDealerNumericId(Number(id));
      }
  
      if (dealer) {
        res.json(dealer);
      } else {
        res.status(404).json({ message: 'Dealer not found' });
      }
    } catch (error) {
      console.error(`Error fetching dealer with ID ${id}:`, error);
      res.status(500).json({ message: 'Internal server error' });
    }
});
  

// Express route to insert review
app.post('/insert_review', express.raw({ type: '*/*' }), async (req, res) => {
  const data = JSON.parse(req.body);
  const documents = await Reviews.find().sort({ id: -1 });
  let new_id = documents[0]['id'] + 1;

  const review = new Reviews({
    id: new_id,
    name: data.name,
    dealership: data.dealership,
    review: data.review,
    purchase: data.purchase,
    purchase_date: data.purchase_date,
    car_make: data.car_make,
    car_model: data.car_model,
    car_year: data.car_year
  });

  try {
    const savedReview = await review.save();
    res.json(savedReview);
  } catch (error) {
    console.error('Error inserting review:', error);
    res.status(500).json({ error: 'Error inserting review' });
  }
});

// Start the Express server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
