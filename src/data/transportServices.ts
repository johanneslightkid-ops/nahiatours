import { Tour } from '../services/toursService';

export const transportServices: Tour[] = [
  {
    id: 1,
    image: 'https://cdn.pixabay.com/photo/2016/11/18/17/20/airport-1834685_1280.jpg',
    title: 'Private Transfer (Punta Cana Zone)',
    description: 'Private airport shuttle with meet-and-greet service and luggage assistance.',
    price: 'From USD 15',
    pricingOptions: [
      { tier: 'Persons', price: 'From USD 15', amount: 15 }
    ],
    details: {
      description: 'Fast and comfortable transfer from the airport or hotel with a dedicated driver and air-conditioned vehicle.',
      images: [
        'https://cdn.pixabay.com/photo/2016/11/18/17/20/airport-1834685_1280.jpg',
        'https://cdn.pixabay.com/photo/2016/11/29/09/16/airport-1867307_1280.jpg'
      ]
    }
  },
  {
    id: 2,
    image: 'https://cdn.pixabay.com/photo/2016/11/29/09/32/car-1868725_1280.jpg',
    title: 'Luxury Transfer',
    description: 'Premium SUV or van service for executive arrivals and special occasions.',
    price: 'From USD 35',
    pricingOptions: [
      { tier: 'Persons', price: 'From USD 35', amount: 35 }
    ],
    details: {
      description: 'Upgrade your arrival with a polished VIP transfer experience and premium comfort.',
      images: [
        'https://cdn.pixabay.com/photo/2016/11/29/09/32/car-1868725_1280.jpg',
        'https://cdn.pixabay.com/photo/2015/01/19/13/51/car-604019_1280.jpg'
      ]
    }
  }
];
