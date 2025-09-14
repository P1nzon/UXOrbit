const { faker } = require('@faker-js/faker');

const testDataGenerator = {
    generate: () => ({
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName(),
        email: faker.internet.email(),
        phone: faker.phone.phoneNumberFormat(),
        address: {
            street: faker.address.streetAddress(),
            city: faker.address.city(),
            state: faker.address.stateAbbr(),
            zip: faker.address.zipCode(),
        },
        birthDate: faker.date.past(30, new Date('2000-01-01')).toISOString().split('T')[0],
        username: faker.internet.userName(),
        password: faker.internet.password(12, false, /[A-Za-z0-9]/),
        company: faker.company.companyName(),
        agree: true, // for checkboxes
        subscribe: true, // for checkboxes
        gender: 'male', // for radios
        terms: true, // for checkboxes
        // semantic keys
        'First Name': faker.name.firstName(),
        'Last Name': faker.name.lastName(),
        'Email': faker.internet.email(),
        'Phone': faker.phone.phoneNumberFormat(),
        'Username': faker.internet.userName(),
        'Password': faker.internet.password(12, false, /[A-Za-z0-9]/),
        'Company': faker.company.companyName(),
        'Gender': 'male',
        'Terms': true,
        'Subscribe': true,
        'Agree': true,
    }),
    validate: {
        email: (email) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email),
        phone: (phone) => /^\+?\d{10,15}$/.test(phone.replace(/\D/g, '')),
        zip: (zip) => /^\d{5}(-\d{4})?$/.test(zip),
        date: (date) => /^\d{4}-\d{2}-\d{2}$/.test(date),
    }
};

module.exports = testDataGenerator;
