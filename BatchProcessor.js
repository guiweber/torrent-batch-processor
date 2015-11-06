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

var nt = require('nt');
var async = require('async');
var fs = require('fs');
var util = require('util');
const EventEmitter = require('events');

/* ==BatchProcessor Class==

Allows performing various batch operations on torrents

Events emitted:
	torrentRead : when a torrent is found and read. Returns a torrent object.
	endRead : when all torrents have been read. Returns an array of torrent objects.
	lookupDirsReady : when the list of lookup directories is done. Returns the list.
	match : when the data of a torrent is found. Returns a torrent object.
	endMatch : when the match scan is done. Returns an array of torrent objects.
	mkDir : when a directory is created. Returns the path of the new directory.
	mkDirExists : when trying to create an existing directory. Returns the path of the directory.
 */
class BatchProcessor{

	constructor(){
		EventEmitter.call(this);
		var self = this;
		this.scanningDir =  0;
		this.scanningMatch = 0;
		this.scanningTor = 0;
		this.progress = [];
		this.progress['read'] = 0;
		this.progress['match'] = 0;
		this.progress['mkDir'] = 0;
		this.progress['mkDirExists'] = 0;
		this.progress['messages'] = [];
		this.torrents = [];
		this.lookupDirs = [];

		this.on('torrentRead', function(){
			this.progress['read'] ++;
		});

		this.on('endRead', function(){
			this.progressSetMessage('Finished reading torrents');
		});

		this.on('lookupDirsReady', function(){
			this.progressSetMessage('Directory list built. ' + this.lookupDirs.length +
			' directories will be scanned');
		});

		this.on('match', function(){
			this.progress['match'] ++;
		});

		this.on('endMatch', function(){
			this.progressSetMessage('Match scan done!');
		});

		this.on('mkDir', function(){
			this.progress['mkDir'] ++;
		});

		this.on('mkDirExists', function(){
			this.progress['mkDirExists'] ++;
		});
	}

	/* 	Recursively scans all directory under the provided path and reads
			the torrent files it finds, storing them in the this.torrent array */
	actionReadTorrents(path){
		path = this.cleanPath(path);
		this.readScan(path);
	}

	actionMatch(path, torrents){
		var self = this;
		path = this.cleanPath(path);
		this.getDirectories(path, function(){self.startMatchScan(path, torrents);});
	}

	actionMkDir(root, torrents){
		var self = this;
		var root = this.cleanPath(root);
		var torrents = this.getArray(torrents);
		torrents.forEach(function(torrent){
			try {
				var path = root + torrent.data.info.name;
				fs.mkdirSync(path);
				this.emit('mkDir', path);
			} catch(e) {
				if( e.code != 'EEXIST' ){ throw e; }
				else{ self.emit('mkDirExists', path); }
			}
		});
	}

	//returns a list of all directories under and including the provided path
	getDirectories(path, callback){
		this.scanningDir++;
		var self = this;
		this.lookupDirs.push(path);
		fs.readdir(path, function(err, files){
			self.scanningDir --;
			if(err) { throw err }
			files.forEach(function(file){
				self.scanningDir++;
				fs.stat(path + file, function(err, stat){
					self.scanningDir --;
					if(err) { throw err }
					if(stat.isDirectory()){
						self.lookupDirs.push(path + file + "/");
						self.getDirectories(path + file + "/", callback);
					}
					if(self.scanningDir === 0){
						self.emit("lookupDirsReady", self.lookupDirs);
						callback();
					}
				});
			});
		});
	}

	//puts data into an array if it isn't one already
	getArray(data){
		var array = []
		if(! Array.isArray(data)){
			array.push(data);
		}else{
			array = data;
		}
		return array;
	}

	//initializes the scan process for each torrent
	startMatchScan(path, torrents){
		var self = this;
		async.eachLimit(torrents, 16, function(torrent, callback){ //16 concurrent scans gives the best performance on my pc
			self.scanningMatch ++;
			torrent.match = '';
			var torrentFiles = self.getTorrentFiles(torrent);
			self.matchScan(path, torrent, torrentFiles, 0, callback);
		});
	}

	//scans all directories until a match is found
	matchScan(path, torrent, torrentFiles, dirIndex, asyncCallback){
		var self = this;
		var scanPath = [];
		for(var n = 0; n < torrentFiles.length; n++){
			scanPath[n] = self.lookupDirs[dirIndex] + torrentFiles[n].path;
		}
		async.map(scanPath, fs.stat, function(err, results){
			if(err) {
				if(dirIndex < self.lookupDirs.length -1){
					self.matchScan(path, torrent, torrentFiles, dirIndex + 1, asyncCallback);
				}else{
					self.scanningMatch --;
					asyncCallback();
				}
			}
			else{
				torrent.match = self.lookupDirs[dirIndex];
				self.scanningMatch --;
				asyncCallback();
				self.emit("match", torrent);
			}
			if(self.scanningMatch === 0){
				self.emit("endMatch");
			}
		});
	}

	//returns the files and file sizes of a torrent
	getTorrentFiles(torrent){
		var files = []
		torrent.data.info.files.forEach(function(item){
			var path = '';
			for(var n = 0; n < item.path.length; n++){
				if(n == 0 ){
					path = item.path[n];
				}else{
					path += "/" + item.path[n];
				}
			}
			var file = {"size": item.length, "path": path};
			files.push(file);
		});
		return files;
	}

	readScan(path){
		var self = this;
		fs.readdir(path, function(err, files){
			if(err) { throw err }
			files.forEach(function(file){
				self.scanningTor ++;
				fs.stat(path + file, function(err, stat){
					if(err) { throw err }
					if(stat.isDirectory()){
						self.readScan(path + file + "/");
						self.scanningTor --;
						if(self.scanningTor === 0){
							self.emit('endRead', self.torrents);
						}
					}else if(stat.isFile()){
						self.readTorrent(path, file);
					}else{
						self.scanningTor --;
					}
				});
			});
		});
	}

	readTorrent(path, file){
		var self = this;
		if(file.slice(-8) == ".torrent"){
			nt.read(path + file, function(err, torrent) {
				if(err) { throw err }
				torrent = {'path' : path, 'filename' : file, 'data' : torrent.metadata};
				self.torrents.push(torrent);
				self.scanningTor --;
				self.emit('torrentRead', torrent);
				if(self.scanningTor === 0){
					self.emit('endRead', self.torrents);
				}
			});
		}else{
			self.scanningTor --;
		}
	}

	//Adds a message to the progress messages
	progressSetMessage(message){
		this.progress['messages'].push(message);
	}

	//Toggles display of the progress
	progressToggle(toggle){
		if(toggle){
			var self = this;
			this.progress['timer'] = setInterval(function(){self.progressPrint()}, 1000);
		}else{
			clearInterval(this.progress['timer']);
			this.progressPrint(); //printing one last time to make sure latest data is shown
		}
	}

	//Displays the progress
	progressPrint(){
		if (process.platform == 'win32'){ process.stdout.write('\x1Bc');}
		else{process.stdout.write('\x1B[2J');} //needs testing on linux

		console.log('Batch Operation Progress');
		console.log(this.progress['read'] + ' torrents read');
		console.log(this.progress['match'] + "/" + this.torrents.length + ' matches found');
		console.log(this.progress['mkDir'] + ' folders created, ' + this.progress['mkDirExists'] + ' already existing');
		console.log('');

		this.progress['messages'].forEach(function(message){
			console.log(message);
		});

	}

	//Makes sure the path finishes with a trailing slash
	cleanPath(path){
		if(path.slice(-1) != "/"){
			return path + "/";
		}
		else {return path;}
	}
};
util.inherits(BatchProcessor, EventEmitter);

module.exports = BatchProcessor;
