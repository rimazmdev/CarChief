/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Vehicle } from '../types';

export const PRESET_VEHICLES: Vehicle[] = [
  {
    id: 'vehicle-1',
    make: 'Audi',
    model: 'R8 Coupe V10 Performance',
    type: 'Coupe',
    year: 2023,
    price: 189900,
    mileage: 3200,
    condition: 'Certified Pre-Owned',
    color: 'Catalunya Red Metallic',
    transmission: 'Dual-Clutch',
    fuelType: 'Petrol',
    engine: '5.2L V10 FSI',
    description: 'The ultimate supercar. Featuring the legendary naturally aspirated V10 engine, Quattro all-wheel drive, and an aggressive, low-slung stance. Styled in a breathtaking Catalunya Red Metallic finish with premium black leather interiors and carbon fiber trim packages. Includes Bang & Olufsen high-fidelity audio and virtual cockpit.',
    images: [
      'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=1000&auto=format&fit=crop&q=80'
    ],
    status: 'Available',
    createdAt: new Date().toISOString()
  },
  {
    id: 'vehicle-2',
    make: 'Porsche',
    model: '911 GT3 RS',
    type: 'Coupe',
    year: 2024,
    price: 274500,
    mileage: 150,
    condition: 'New',
    color: 'Carrara White Metallic',
    transmission: 'Dual-Clutch',
    fuelType: 'Petrol',
    engine: '4.0L Naturally Aspirated Boxer-6',
    description: 'Born on the racetrack, legal on the street. This brand new Porsche 911 GT3 RS is styled in premium Carrara White with contrasting red racing stripes and carbon fiber aerodynamic wing. Active aerodynamics, lightweight Weissach package, and motorsport-grade steering wheel controls.',
    images: [
      'https://images.unsplash.com/photo-1611016186353-9af58c69a533?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1611245321331-3c3fa1a1a457?w=1000&auto=format&fit=crop&q=80'
    ],
    status: 'Available',
    createdAt: new Date().toISOString()
  },
  {
    id: 'vehicle-3',
    make: 'Tesla',
    model: 'Model S Plaid',
    type: 'Sedan',
    year: 2023,
    price: 94990,
    mileage: 8400,
    condition: 'Used',
    color: 'Ultra Red',
    transmission: 'Automatic',
    fuelType: 'Electric',
    engine: 'Tri-Motor AWD (1,020 hp)',
    description: 'Unbelievable acceleration. 0-60 mph in 1.99 seconds. This stunning Ultra Red Model S Plaid offers elite styling, an executive black leather cabin with carbon fiber trim, a yoke steering wheel, and high-tech infotainment screens for front and rear passengers.',
    images: [
      'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1563720223185-11003d516935?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=1000&auto=format&fit=crop&q=80'
    ],
    status: 'Available',
    createdAt: new Date().toISOString()
  },
  {
    id: 'vehicle-4',
    make: 'Mercedes-Benz',
    model: 'AMG GT 63 S E-Performance',
    type: 'Sedan',
    year: 2024,
    price: 198000,
    mileage: 450,
    condition: 'New',
    color: 'Opalith White Bright',
    transmission: 'Automatic',
    fuelType: 'Hybrid',
    engine: '4.0L V8 Biturbo Hybrid',
    description: 'Experience absolute grand touring power. Offering 843 horsepower of hybrid capability in a gorgeous Opalith White metallic four-door coupe configuration. Equipped with adaptive AMG ride control, red brake calipers, active ambient cabin controls, and full driver assistance suites.',
    images: [
      'https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1542282088-fe8426682b8f?w=1000&auto=format&fit=crop&q=80'
    ],
    status: 'Available',
    createdAt: new Date().toISOString()
  },
  {
    id: 'vehicle-5',
    make: 'BMW',
    model: 'M4 Competition xDrive Coupe',
    type: 'Coupe',
    year: 2023,
    price: 89500,
    mileage: 12100,
    condition: 'Used',
    color: 'Alpine White',
    transmission: 'Automatic',
    fuelType: 'Petrol',
    engine: '3.0L TwinPower Turbo Inline-6',
    description: 'Precision engineering in an aggressive package. Painted in pristine Alpine White with an active carbon fibre roof and customized red brake calipers. Features the state-of-the-art BMW Curved Display, customizable sport M modes, and a robust xDrive all-wheel-drive traction system.',
    images: [
      'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=1000&auto=format&fit=crop&q=80'
    ],
    status: 'Pending',
    createdAt: new Date().toISOString()
  },
  {
    id: 'vehicle-6',
    make: 'Land Rover',
    model: 'Range Rover Sport SV Edition One',
    type: 'SUV',
    year: 2024,
    price: 180300,
    mileage: 80,
    condition: 'New',
    color: 'Firenze Red Metallic',
    transmission: 'Automatic',
    fuelType: 'Petrol',
    engine: '4.4L Twin-Turbo V8 MHEV',
    description: 'The highest luxury paired with ultimate performance. The SV Edition One offers Firenze Red metallic exterior with black gloss highlights, 23-inch carbon fibre wheels, custom sports seats with body-and-soul sensors, and a supreme 635-horsepower mild hybrid V8 engine.',
    images: [
      'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1508974239320-0a029497e820?w=1000&auto=format&fit=crop&q=80'
    ],
    status: 'Available',
    createdAt: new Date().toISOString()
  }
];
