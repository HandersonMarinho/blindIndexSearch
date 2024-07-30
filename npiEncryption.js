// TODO: Real case scenario the encryption/hash strategy will be: 
// Encryption: https://github.com/nelnet-velocity/nni-velocity-lib-crypto/blob/develop/src/CryptoEngine.ts#L13
// Hash: https://github.com/nelnet-velocity/nni-velocity-lib-crypto/blob/develop/src/SCryptHashEngine.ts
const AesEncryption = require("aes-encryption");
const sha1 = require('sha1');

const { printTable } = require("console-table-printer");
const prompt = require("prompt");
const JSONdb = require("simple-json-db");

let aes = undefined;
let tApplications = undefined;
let tBlindIndexes = undefined;
const encrypt = process.argv[2] === '--true';
const verbose = process.argv[3] === '--verbose';
const load = [...Array(10).keys()];

function boostrap() {
    aes = new AesEncryption();
    aes.setSecretKey(
        "11122233344455566677788822244455555555555555555231231321313aaaff"
    );
    tApplications = new JSONdb("tApplications.json");
    tBlindIndexes = new JSONdb("tBlindIndexes.json");
    tApplications.JSON({});
    tBlindIndexes.JSON({});
}

async function createApplication(application, crip) {
    return new Promise((res) => {
        const applicationId = Object.values(tApplications.JSON()).length + 1;
        const newEntry = crip ? {
            id: applicationId,
            requestedAmount: application.requestedAmount,
            firstName: aes.encrypt(application.firstName),
            lastName: aes.encrypt(`${application.lastName}-${applicationId}`),
            ssn: aes.encrypt(application.ssn),
            city: aes.encrypt(application.city),
            street: aes.encrypt(application.street),
            state: aes.encrypt(application.state),
            zipCode: aes.encrypt(application.zipCode),
            birthday: aes.encrypt(application.birthday),
        } : {
            id: applicationId,
            ...application,
        };
        tApplications.set(applicationId, newEntry);

        if (encrypt) {
            createSearchIndexes(applicationId, "firstName", application.firstName);
            createSearchIndexes(applicationId, "lastName", application.lastName);
            createSearchIndexes(applicationId, "city", application.city);
        }

        res(newEntry);
    });
}

function createSearchIndexes(keyId, propName, propValue) {
    // Create minimum 3 char sentence
    var listSencentes = mountSentences(propValue);
    for (const value of listSencentes) {
        if (value.length >= 3) {
            tBlindIndexes.set(Object.values(tBlindIndexes.JSON()).length++, {
                keyId,
                sentence: value,
                hash: sha1(`${propName}-${value}`),
            });
        }
    }
}

function mountSentences(s) {
    let listCombinations = new Array();
    let partition = '';
    for (i = 0; i < s.length; i++) {
        for (j = i + 1; j < s.length + 1; j++) {
            partition = s.slice(i, j)
            listCombinations.push(partition);
            if ((/[A-Z]/.test(partition))) {
                listCombinations.push(partition.toLowerCase());
            }
        }
    }
    return listCombinations;
}

async function findBorrower(query) {
    return new Promise((res) => {
        var applications = Object.values(tApplications.JSON());
        var result = applications.filter(search, query).map((a) => {
            if (encrypt) {
                return {
                    firstName: aes.decrypt(a.firstName),
                    lastName: aes.decrypt(a.lastName),
                    street: aes.decrypt(a.street),
                    city: aes.decrypt(a.city),
                    state: aes.decrypt(a.state),
                    zipCode: aes.decrypt(a.zipCode),
                    birthday: aes.decrypt(a.birthday),
                    ssn: aes.decrypt(a.ssn),
                };
            } else {
                return a;
            }
        });
        res(result.filter(distinct));
    });
}

async function loadData() {
    console.log('Loading database...')
    var applications = [{
            firstName: "Devon",
            lastName: "Minch",
            street: "7950 CLAIBORNE LN",
            city: "Plano",
            state: "MN",
            zipCode: "55076",
            birthday: "1990-04-01",
            ssn: "666735027",
            requestedAmount: 5000,
        },
        {
            firstName: "Tricia",
            lastName: "Achey",
            street: "2686 Montrose Pl",
            city: "Santa Barbara",
            state: "CA",
            zipCode: "93105",
            birthday: "1990-03-01",
            ssn: "666661194",
            requestedAmount: 12000,
        },
        {
            firstName: "Judy",
            lastName: "Endres",
            street: "9019 LYNN AV",
            city: "West Chester",
            state: "OH",
            zipCode: "45069",
            birthday: "1960-09-01",
            ssn: "666222702",
            requestedAmount: 3800,
        },
        {
            firstName: "Judas",
            lastName: "Santos",
            street: "5486 Park Harbor",
            city: "Miami",
            state: "FL",
            zipCode: "54328",
            birthday: "1960-09-01",
            ssn: "211455809",
            requestedAmount: 1800,
        },
        {
            firstName: "Patricia",
            lastName: "Mendeles",
            street: "454 Park Av",
            city: "Weston",
            state: "FL",
            zipCode: "54945",
            birthday: "1984-08-20",
            ssn: "876542879",
            requestedAmount: 14600,
        },
        {
            firstName: "Joseph",
            lastName: "Shall",
            street: "546 Santa Maria Drive",
            city: "Irvine",
            state: "CA",
            zipCode: "85435",
            birthday: "1998-11-15",
            ssn: "211899846",
            requestedAmount: 5000,
        },
        {
            firstName: "Jose",
            lastName: "Ferreira",
            street: "5014 Sait Germant Av",
            city: "New York",
            state: "NY",
            zipCode: "87125",
            birthday: "1985-02-05",
            ssn: "856233012",
            requestedAmount: 6300,
        },
        {
            firstName: "Josh",
            lastName: "Ballmer",
            street: "1054 Olympic Road",
            city: "Santa Ana",
            state: "CA",
            zipCode: "84325",
            birthday: "1985-02-05",
            ssn: "543210278",
            requestedAmount: 7000,
        },
        {
            firstName: "Josh",
            lastName: "Blankers",
            street: "1054 Olympic Road",
            city: "Santa Ana",
            state: "CA",
            zipCode: "84325",
            birthday: "1985-02-05",
            ssn: "543210278",
            requestedAmount: 7000,
        }
    ];

    let applicationIndex = 0;
    for (const index of load) {
        //var rand = Math.floor(Math.random() * applications.length);
        if (applicationIndex === applications.length) applicationIndex = 0;
        var app = applications[applicationIndex];
        await createApplication({
                ...app,
                lastName: `${app.lastName}-${index}`,
            },
            encrypt
        );
        applicationIndex++;
    }
}

function distinct(value, index, self) {
    return self.indexOf(value) === index;
}

function search(item) {
    if (encrypt) {
        return Object.keys(this).every((key) => {
            const match = Object.values(tBlindIndexes.JSON()).filter(
                (s) => s.hash === this[key]
            );
            if (match) {
                return match.map((m) => m.keyId).includes(item["id"]);
            } else {
                return null;
            }
        });
    } else {
        return Object.keys(this).every((key) => {
            return item[key].indexOf(this[key]) !== -1;
        });
    }
}

async function init() {
    prompt.start();
    prompt.get(["firstName"], async(err, result) => {
        console.time("exec");
        result.firstName = encrypt ?
            sha1(`${Object.getOwnPropertyNames(result)[0]}-${result.firstName}`) :
            result.firstName;
        var filterResult = await findBorrower(result);
        if (filterResult.length > 0) {
            printTable(filterResult);
            console.log(`${filterResult.length} results`);
        } else console.log("No data match");
        console.timeEnd("exec");

        await init();
    });
}

/*
    To support additional GLBA (Gramm Leach Bliley Act) requirements we need to look into options for encrypting NPI 
    (Nonpublic Personal Information) fields in our entities. Here is a list of fields that are considered NPI:

    - Name
    - Date or location of birth
    - Address
    - Income
    - Social Security number
    - Driver’s license number
    - Credit Score
    - Income history
    - Other information on an application to obtain a loan, credit card, or other financial product or service
    - Information obtained through Internet cookies and other web server information collecting devices
*/
(async() => {
    boostrap();
    await loadData();

    if (encrypt) {
        let applications = Object.values(tApplications.JSON())
        applications = applications.map(a => {
            return {
                id: a.id,
                requestedAmount: a.requestedAmount,
                firstName: `${a.firstName.substring(0, 10)}...`,
                lastName: `${a.lastName.substring(0, 10)}...`,
                ssn: `${a.ssn.substring(0, 10)}...`,
                city: `${a.city.substring(0, 10)}...`,
                street: `${a.street.substring(0, 10)}...`,
                state: `${a.state.substring(0, 10)}...`,
                zipCode: `${a.zipCode.substring(0, 10)}...`,
                birthday: `${a.birthday.substring(0, 10)}...`,
            }
        })
        printTable(applications);
        if (verbose)
            printTable(Object.values(tBlindIndexes.JSON()));
    } else {
        printTable(Object.values(tApplications.JSON()));
    }

    await init();
})();