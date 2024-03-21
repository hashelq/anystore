# use discord as google drive

```.env
token=<discord bot token>
channelId=<discord channel id>
enckey=<any encryption key string>
```

into .env

```bash
mkdir db # make database
touch db/files.txt # create a files table
bun src/index.ts s <dir> # store dir recursively
bun src/index.ts f <dir> # fetch dir recursively (must be in the db/files.txt)
```

### Speed
It's PoC, not a real performant program, it will work bad with millions of flies in the .txt db.

### Features
* Abstract interface
* Customizable encryption algorithm
* Customizable chunk size
* Customizable concurrent connections

### LICENCE
Code (src) is under GNU GPL 3.
