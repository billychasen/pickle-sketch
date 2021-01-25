import sketch from 'sketch';
var Document = require('sketch/dom').Document;
var Settings = require('sketch/settings');
var UI = require('sketch/ui');

export default async function() {
    UI.alert('Help', 'Select 2 to 4 layers that you would like to ask a question about.');
}
