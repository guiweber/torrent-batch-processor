# torrent-batch-processor
A [Node.js](https://nodejs.org) library making batch operations on torrents easier

It is currently in early developpement stage and may be unstable and/or incomplete.

## Install
Download from github, do npm install from the download folder to install the dependencies, then require tbp.js in your application.

## API - Methods

### match(source, lookup, callback)
Scans *lookup* for files belonging to the torrents found in *source*

### createFolders(source, dest, callback)
Creates the default folder for all torrents found in *source*. The folders are created under *dest*.

## The torrent object
TBD

## The BatchProcessor class
For more flexibility, the BatchProcessor class is also exposed as .BatchProcessor and can be instantiated. The following methods are of interest.

### actionReadTorrents(path)
### actionMatch(path, torrents)
### actionMkDir(root, torrents)