# torrent-batch-processor
A [Node.js](https://nodejs.org) library making batch operations on torrents easier.

It is currently in early developpement stage and may be unstable and/or incomplete.

## Install
Download from github, do npm install from the download folder to install the dependencies, then require tbp.js in your application.

## API

### match(source, lookup, callback)
Scans *lookup* for files belonging to the torrents found in *source*

### copy(source, lookup, dest, defDir, callback)
Scans *lookup* for files belonging to the torrents found in *source* and copies
all files in the matching directory to another under *dest*.

If *defDir* is true, the data is copied under the default torrent directory name, 
if false,the matching directory name is used.

### createDefDirs(source, dest, callback)
Creates the default folder for all torrents found in *source*. The folders are created under *dest*.

## The torrent object
TBD

## The BatchProcessor class
For more flexibility, the BatchProcessor class is also exposed as .BatchProcessor and can be instantiated to work on different sets of torrents at the same time.

### Methods of interest
#### actionReadTorrents(path)
#### actionMatch(path, torrents)
#### actionMkDir(root, torrents)

### Events emitted
	- torrentRead : when a torrent is found and read. Returns a torrent object.
	- endRead : when all torrents have been read. Returns an array of torrent objects.
	- lookupDirsReady : when the list of lookup directories is done. Returns the list.
	- match : when the data of a torrent is found. Returns a torrent object.
	- endMatch : when the match scan is done. Returns an array of torrent objects.
	- mkDir : when a directory is created. Returns the path of the new directory.
	- mkDirExists : when trying to create an existing directory. Returns the path of the directory.
