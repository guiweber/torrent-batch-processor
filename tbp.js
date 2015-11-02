'use strict';

exports.BatchProcessor = require('./BatchProcessor.js');
var batch = new exports.BatchProcessor();

/*
Creates the default folder for all torrents found in *source*. The folders are created under *dest*.
*/
exports.createFolders = function(source, dest, callback){
	var statusString = 'Creating default directory for torrents...';
	var created = 0;
	status(statusString);
	batch.actionReadTorrents(source);
	batch.on('torrentRead', function(torrent){
		batch.actionMkDir(dest, torrent);
		created ++;
		status(statusString, created + ' folders created so far.');
	});
	batch.on('endReadTorrents', function(allTorrents){
		console.log('done!');
		callback(allTorrents);
	});
};

/*
Scans *lookup* for files belonging to the torrents found in *source*
*/
exports.match = function(source, lookup, callback){
	var statusString = 'Finding matches...';
	var read = 0;
	var matched = 0;
	status(statusString);
	batch.actionReadTorrents(source);
	batch.on('torrentRead', function(torrent){
		read ++;
		status(statusString, read + ' torrents read so far.');
	});
	batch.on('endReadTorrents', function(allTorrents){
		status(statusString, 'finished reading torrents');
		batch.actionMatch(lookup, allTorrents);
	});
	batch.on('endDir', function(count){
		status(statusString, ' Directory structure built. ' + count + ' directories will be scanned');
	});
	batch.on('match', function(torrent){
		matched ++;
		status(statusString, matched + "/" + batch.torrents.length + ' matches found');
	});
	batch.on('endMatch', function(){
		status(statusString, 'Scanning done!');
		callback(batch.torrents);
	});
};

/*
updates the onscreen status
*/
function status(title, progress){
	progress = progress || '';
	/*if (process.platform == 'win32'){
		process.stdout.write('\x1Bc');
	}else{
		process.stdout.write('\x1B[2J'); //needs testing on linux
	}
	console.log(title);*/
	console.log(progress);
}
