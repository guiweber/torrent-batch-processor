'use strict';

var nt = require('nt');
var async = require('async');
var fs = require('fs');
var util = require('util');
const EventEmitter = require('events');

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

/*
This class recursively scans all directory under the provided path and reads the torrent files it finds

Events:
	'torrentRead' : emited when a torrent is found and read. Returns a torrent object.
	'end' : emited when the scan is completed. Returns an array of torrent objects.
 */

class BatchProcessor{

	constructor(){
		EventEmitter.call(this);
		var caller = this;
		this.scanningDir =  0;
		this.scanningMatch = 0;
		this.matchesFound = 0;
		this.scanningTor = 0;
		this.torrents = [];
		this.directories = [];
	}

	actionReadTorrents(path){
		path = this.cleanPath(path);
		this.readScan(path);
	}

	actionMatch(path, torrents){
		var caller = this;
		path = this.cleanPath(path);
		this.getDirectories(path, function(){caller.startMatchScan(path, torrents);});
	}

	actionMkDir(root, torrents){
		root = this.cleanPath(root);
		torrents = this.getArray(torrents);
		torrents.forEach(function(torrent){
			try {
				fs.mkdirSync(root + torrent.data.info.name);
			} catch(e) {
				if ( e.code != 'EEXIST' ) throw e;
			}
		});
	}

	//returns a list of all directories under and including the provided path
	getDirectories(path, callback){
		this.scanningDir++;
		var caller = this;
		this.directories.push(path);
		fs.readdir(path, function(err, files){
			caller.scanningDir --;
			if(err) { throw err }
			files.forEach(function(file){
				caller.scanningDir++;
				fs.stat(path + file, function(err, stat){
					caller.scanningDir --;
					if(err) { throw err }
					if(stat.isDirectory()){
						caller.directories.push(path + file + "/");
						caller.getDirectories(path + file + "/", callback);
					}
					if(caller.scanningDir === 0){
						caller.emit("endDir", caller.directories.length);
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
		var caller = this;
		async.eachLimit(torrents, 16, function(torrent, callback){ //16 concurrent scans gives the best performance on my pc
			caller.scanningMatch ++;
			torrent.match = '';
			var torrentFiles = caller.getTorrentFiles(torrent);
			caller.matchScan(path, torrent, torrentFiles, 0, callback);
		});
	}

	//scans all directories until a match is found
	matchScan(path, torrent, torrentFiles, dirIndex, asyncCallback){
		var caller = this;
		var scanPath = [];
		for(var n = 0; n < torrentFiles.length; n++){
			scanPath[n] = caller.directories[dirIndex] + torrentFiles[n].path;
		}
		async.map(scanPath, fs.stat, function(err, results){
			if(err) {
				if(dirIndex < caller.directories.length -1){
					caller.matchScan(path, torrent, torrentFiles, dirIndex + 1, asyncCallback);
				}else{
					caller.scanningMatch --;
					asyncCallback();
				}
			}
			else{
				torrent.match = caller.directories[dirIndex];
				caller.scanningMatch --;
				asyncCallback();
				caller.emit("match", torrent);
			}
			if(caller.scanningMatch === 0){
				caller.emit("endMatch");
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
		var caller = this;
		fs.readdir(path, function(err, files){
			if(err) { throw err }
			files.forEach(function(file){
				caller.scanningTor ++;
				fs.stat(path + file, function(err, stat){
					if(err) { throw err }
					if(stat.isDirectory()){
						caller.readScan(path + file + "/");
						caller.scanningTor --;
						if(caller.scanningTor === 0){
							caller.emit('endReadTorrents', caller.torrents);
						}
					}else if(stat.isFile()){
						caller.readTorrent(path, file);
					}else{
						caller.scanningTor --;
					}
				});
			});
		});
	}

	readTorrent(path, file){
		var caller = this;
		if(file.slice(-8) == ".torrent"){
			nt.read(path + file, function(err, torrent) {
				if(err) { throw err }
				torrent = {'path' : path, 'filename' : file, 'data' : torrent.metadata};
				caller.torrents.push(torrent);
				caller.scanningTor --;
				caller.emit('torrentRead', torrent);
				if(caller.scanningTor === 0){
					caller.emit('endReadTorrents', caller.torrents);
				}
			});
		}else{
			caller.scanningTor --;
		}
	}

	statusMessage(message){

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
