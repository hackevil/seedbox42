
var express = require('express');
var router = express.Router();
var File = require('../models/File.js');
var njds = require('nodejs-disks');
var ft = require('../utils/ft');


var getTotalDiskSpace = function (done) {
	njds.drives(function (err, drives) {
		if (err)
			return done(err);
		else
			njds.drivesDetail(drives, function (err, data) {
				console.log("DRIVES :", drives);
				console.log("DATA :", data);
				// console.log(data);
				for (var i = 0; i < data.length; i++)
				{
					if (data[i].mountpoint === '/')
						return done(null, { used: data[i].used, freePer: parseInt(data[i].freePer, 10), usedPer: parseInt(data[i].usedPer, 10), total: data[i].total});
				}
				return done('Could not find any data');
			});
	});
};

var sortRule = { createdAt: -1 };
var selectRule = '-path -creator -hashString -isFinished -privacy -torrentAddedAt';

router.get('/oldest-locked-file', function (req, res, next) {
	File.getUserLockedFiles(req.user, 1, 5, function (err, files) {
		if (err)
			res.json({ success: false, message: err });
		else
			res.json({ success: true, data: files });
	});
});

router.get('/recent-user-file', function (req, res, next) {
	File.getFileList({ creator: req.user._id }, { createdAt: -1 }, 5, req.user, function (err, files) {
		if (err)
			res.json({ success: false, message: err });
		else
			res.json({ success: true, data: files });
	});
});

router.get('/recent-file', function (req, res, next) {
	File.getFileList({}, { createdAt: -1 }, 5, req.user, function (err, files) {
		if (err)
			res.json({ success: false, message: err });
		else
			res.json({ success: true, data: files });
	});
});

router.get('/disk-space', function (req, res, next) {
	getTotalDiskSpace(function (err, diskInfos) {
		if (err)
			res.json({ success: false, message: err });
		else
			res.json({ success: true, data: diskInfos });
	});
});

router.get('/', function (req, res, next) {
	var userLastFiles = null;
	var lastFiles = null;
	var diskSpace = null;
	var sortRule = { createdAt: -1 };
	var selectRule = '-path -creator -hashString -isFinished -privacy -torrentAddedAt';
	var errors = {
		userFilesError: { happened: false },
		filesError: { happened: false },
		diskSpaceError: { happened: false }
	};
	File.find({ creator: req.user._id }).select(selectRule).sort(sortRule).limit(5).exec(function (err, userFiles) {
		if (err)
		{
			errors.userFilesError.happened = true;
			errors.userFilesError.err = err;
		}
		else
			userLastFiles = ft.formatFileList(userFiles, req.user);
		File.find({}).select(selectRule).sort(sortRule).limit(5).exec(function (err, files) {
			if (err)
			{
				errors.filesError.happened = true;
				errors.filesError.err = err;
			}
			else
				lastFiles = ft.formatFileList(files, req.user);
			getTotalDiskSpace(function (err, diskInfos) {
				if (err)
				{
					errors.diskSpaceError.happened = true;
					errors.diskSpaceError.err = err;
				}
				else
					diskSpace = diskInfos;
				res.json({ userLastFiles: userLastFiles, lastFiles: lastFiles, diskSpace: diskSpace, errors: errors });
					// req.app.get('transmission').freeSpace(req.app.get('config').transmissionFolder, function (err, data) {
					// 	if (err)
					// 	{
					// 		errors.diskSpaceError.happened = true;
					// 		errors.diskSpaceError.err = err;
					// 	}
					// 	else
					// 	{
					// 		var freeSpace = parseInt(data['size-bytes'], 10);
					// 		diskSpace = { total: totalDiskSpace, free: freeSpace, percent: ((freeSpace * 100) / diskSpace) };
					// 	}
					// 	res.json({ userLastFiles: userLastFiles, lastFiles: lastFiles, diskSpace: diskSpace, errors: errors });
					// });
			});
		});
	});
});

module.exports = router;
