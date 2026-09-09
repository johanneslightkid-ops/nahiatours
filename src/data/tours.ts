import { Tour } from '../services/toursService';

export const tours: Tour[] = [
  {
    id: 1,
    image: 'https://cdn.pixabay.com/photo/2016/11/19/14/00/beach-1836467_1280.jpg',
    title: 'Remote Island Trip (Saona)',
    description: 'Discover the stunning beauty of Saona Island with a relaxing day of sun and sand.',
    price: '$100',
    pricingOptions: [
      { tier: 'Persons', price: '$100', amount: 100 }
    ],
    details: {
      description: 'Spend the day on white-sand beaches with boat transfers, a natural pool stop, and island time under the palms.',
      images: [
        'https://cdn.pixabay.com/photo/2016/11/19/14/00/beach-1836467_1280.jpg',
        'https://cdn.pixabay.com/photo/2016/11/29/05/45/beach-1867271_1280.jpg'
      ]
    }
  },
  {
    id: 2,
    image: 'https://cdn.pixabay.com/photo/2019/06/11/18/56/quad-4268938_1280.jpg',
    title: 'Buggies Adventure',
    description: 'Get your adrenaline pumping with an exciting 4-wheeler adventure through the jungle.',
    price: '$85',
    pricingOptions: [
      { tier: 'Persons', price: '$85', amount: 85 }
    ],
    details: {
      description: 'Drive muddy backroads, visit a hidden cenote, and cool off after a high-energy buggy route.',
      images: [
        'https://cdn.pixabay.com/photo/2019/06/11/18/56/quad-4268938_1280.jpg',
        'https://cdn.pixabay.com/photo/2016/03/27/19/31/adventure-1286920_1280.jpg'
      ]
    }
  },
  {
    id: 3,
    image: 'https://cdn.pixabay.com/photo/2016/11/22/19/18/boat-1850214_1280.jpg',
    title: 'Party Boat Experience',
    description: 'Join us for a fun-filled day on the water with music, drinks, and great company.',
    price: '$65',
    pricingOptions: [
      { tier: 'Persons', price: '$65', amount: 65 }
    ],
    details: {
      description: 'Cruise along the Caribbean coast with music, snorkeling, and a festive natural pool stop.',
      images: [
        'https://cdn.pixabay.com/photo/2016/11/22/19/18/boat-1850214_1280.jpg',
        'https://cdn.pixabay.com/photo/2016/11/21/15/46/beach-1846035_1280.jpg'
      ]
    }
  }
];
