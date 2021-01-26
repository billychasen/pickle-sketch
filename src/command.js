import sketch from 'sketch';
var Document = require('sketch/dom').Document;
var Settings = require('sketch/settings');
var UI = require('sketch/ui');

async function getUserInput(question, placeholder) {
    return new Promise((resolve, reject) => {
        sketch.UI.getInputFromUser(
            question, {initialValue: placeholder},
            (err, value) => {
                if (err) {
                    resolve(null);
                } else {
                    resolve(value.trim());
                }
            });
    });
}

async function getApiKey() {
    var key = Settings.settingForKey('apikey');
    if (!key) {
        key = await getUserInput("Please enter your pickle API key (found at https://pickle.run/docs_api)", "");
        Settings.setSettingForKey('apikey', key);
    }

    return key;
}

async function apiCall(path, data, callback) {
    var formData = new FormData();
    formData.append('apikey', await getApiKey());

    Object.keys(data).forEach(function(key) {
        if (key.startsWith("img")) {
            formData.append(key, {
                fileName: key + ".png",
                mimeType: 'image/png',
                data: data[key]
            });
        } else {
            formData.append(key, '' + data[key]);
        }
    });

    fetch("https://pickle.run/api" + path, {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => callback(data))
        .catch(e => { console.error(e); callback(null); });
}

async function startQuestion(available_credits) {
    let doc = sketch.getSelectedDocument();
    let selectedLayers = doc.selectedLayers.layers;

    if (selectedLayers.length < 2 || selectedLayers.length > 4) {
        UI.alert('Error', 'Select 2 to 4 layers that you would like to compare.');
        return;
    }

    var data = {};

    selectedLayers.forEach((layer, x) => {
        const options = {
            "save-for-web": true,
            formats: "png",
            "use-id-for-name": true,
            overwriting: true,
            output: "/tmp",
        };
        let exp = sketch.export(layer, options);

        let fp = NSData.alloc().initWithContentsOfFile("/tmp/" + layer.id + ".png");
        data["img" + (x+1)] = fp;
    });

    var question = await getUserInput("What question would you like to ask people", "Which design do you like better?");
    if (!question) { return; }

    var n = await getUserInput("How many people would you like to ask?", "20");
    if (!n) { return; }

    data["question"] = question;
    data["n"] = n;

    if (isNaN(parseInt(n)) || parseInt(n) > available_credits) {
        UI.alert('Error', "You don't have enough credits. You can reload on pickle.run");
        return;
    }

    apiCall("/pick", data, (response) => {
        if (response && response["pid"]) {
            sketch.UI.message("Your question has been posted! 🎉");
        } else if (response && response["error"]) {
            sketch.UI.message("Oops, looks like there was an error: " + response["error"]);
        }
    });
}

export default async function() {
    // check api key
    var key = await getApiKey();

    apiCall("/test", {}, (data) => {
        if (!data) {
            UI.alert('Error', 'Invalid API key. Please try again.');
            Settings.setSettingForKey('apikey', null);
        } else {
            var credits = data["credits"];
            startQuestion(credits);
        }
    });
}
