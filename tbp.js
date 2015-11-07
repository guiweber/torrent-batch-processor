'use strict';
/*
	Torrent batch processor - A Node.js library making batch operations on torrents easier
	Copyright (C) 2015 Guillaume Weber
	https://github.com/guiweber/torrent-batch-processor

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

exports.BatchProcessor = require('./BatchProcessor.js');
var batch = new exports.BatchProcessor();

/*
Creates the default folder for all torrents found in *source*. The folders are created under *dest*.
*/
exports.createDefDirs = function(source, dest, callback){
	batch.progressToggle(true);
	batch.progressSetMessage('Creating default directory for torrents...');

	batch.actionReadTorrents(source);
	batch.on('torrentRead', function(torrent){
		batch.actionMkDir(dest, true, torrent);
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
	batch.actionReadTorrents(source);

	batch.on('endRead', function(allTorrents){
		batch.actionMatch(lookup, allTorrents);
	});

	batch.on('endMatch', function(){
		batch.progressToggle(false);
		batch.printNoMatch();
		callback(batch.torrents);
	});
};

/*
Scans *lookup* for files belonging to the torrents found in *source* and copies
all files in the matching directory to another under *dest*.
If *defDir* is true, the data is copied under the default torrent directory name,
if false,the matching directory name is used.
*/
exports.copy = function(source, lookup, dest, defDir, callback){
	batch.progressToggle(true);
	batch.actionReadTorrents(source);

	batch.on('endRead', function(allTorrents){
		batch.actionMatch(lookup, allTorrents);
	});

	batch.on('endMatch', function(allTorrents){
		batch.actionCopy(dest, defDir, allTorrents);
	});

	batch.on('endCopy', function(){
		batch.progressToggle(false);
		batch.printNoMatch();
		callback(batch.torrents);
	});
};
