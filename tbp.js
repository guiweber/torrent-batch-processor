'use strict';

exports.BatchProcessor = require('./BatchProcessor.js');
var batch = new exports.BatchProcessor();

/*
Creates the default folder for all torrents found in *source*. The folders are created under *dest*.
*/
exports.createFolders = function(source, dest, callback){
	batch.progressToggle(true);
	batch.progressSetMessage('Creating default directory for torrents...');

	batch.actionReadTorrents(source);
	batch.on('torrentRead', function(torrent){
		batch.actionMkDir(dest, torrent);
	});
	batch.on('endRead', function(allTorrents){
		batch.progressToggle(false);
		callback(allTorrents);
	});
};

/*
Scans *lookup* for files belonging to the torrents found in *source*
*/
exports.match = function(source, lookup, callback){
	batch.progressToggle(true);
	batch.progressSetMessage('Finding matches...');

	batch.actionReadTorrents(source);

	batch.on('endRead', function(allTorrents){
		batch.actionMatch(lookup, allTorrents);
	});

	batch.on('endMatch', function(){
		batch.progressToggle(false);
		callback(batch.torrents);
	});
};
