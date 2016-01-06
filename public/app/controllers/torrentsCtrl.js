
app.controller('torrentsCtrl', function ($scope, $rootScope, $interval, $timeout, socket, RequestHandler, Upload, Tools) {

	console.log("torrentsCtrl");

	//------------------------------------------------  VARIABLES -------------------------------------------------------
	$scope.torrentUrls = [
		"magnet:?xt=urn:btih:2b12ce09236526a728c6974c0d89d52860e82daa&dn=Major+Lazer+x+DJ+Snake+feat.+M%26Oslash%3B+-+Lean+On.mp3&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=udp%3A%2F%2Fopen.demonii.com%3A1337&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Fexodus.desync.com%3A6969",
		"https://torcache.net/torrent/C54CE5AD116BD42F0C8FB59E79FC9BEC0D2919F8.torrent?title=[kat.cr]alcohol.120.2.0.3.8314.final.crack.techtools",
		"https://torcache.net/torrent/8C0AC56C38391A50EC542220F7E83D9544292BCA.torrent?title=[kat.cr]fansub.resistance.naruto.shippuuden.438.1280x720.mp4"
	]
	$scope.newTorrentUrl = "";
	$scope.torrents = {};
	$scope.checkboxAll = false;
	$scope.itemSelected = [];

	//------------------------------------------------  EVENTS SOCKETS -------------------------------------------------------
	socket.emit('torrentRefresh');

	socket.on("put:torrent:rename", function(data){
		console.log("NEWNAME", data);
		$scope.torrents[data.id].name = data.newName;
	});

	socket.on('delete:torrent', function(data){
		for (var key in data.ids){
			var index = $scope.itemSelected.indexOf(data.ids[key]);
			if (index >= 0)
				$scope.itemSelected.splice(index, 1);
			delete $scope.torrents[data.ids[key]];
		}
	});

	socket.on('post:torrent', function(data){
		if (data.success){
			RequestHandler.get(api + "torrent/refresh/" + data.id)
				.then(function(resultRefresh){
					$scope.torrents[data.id] = resultRefresh.data.data.torrents[0];
					$rootScope.msgInfo("Un nouveau torrent a ete ajoute", data.name);
			});
		}
	});

	socket.on("torrentRefreshRes", function(data){
		angular.forEach(data.result.torrents, function(newTorrent, keys) {
			if (newTorrent.id in $scope.torrents){
				for (var key in newTorrent){
					$scope.torrents[newTorrent.id][key] = newTorrent[key];
				};
				$scope.torrents[newTorrent.id].percentDone = $scope.torrents[newTorrent.id].percentDone * 100;
			}
		});
	});

	socket.on("torrentFirstRefresh", function(data){
		for(var key in data.torrents.torrents){
			$scope.torrents[data.torrents.torrents[key].id] = angular.copy(data.torrents.torrents[key]);
			$scope.torrents[data.torrents.torrents[key].id].percentDone = $scope.torrents[data.torrents.torrents[key].id].percentDone * 100;
			$scope.torrents[data.torrents.torrents[key].id].checkbox = false;
		}
	});

	//------------------------------------------------  FUNCTIONS SCOPE -------------------------------------------------------
	$scope.torrentRemove = function(arrayId, local){
		if (!arrayId.length){
			arrayId = Tools.getElementForMatchValue($scope.torrents, "id", "checkbox", true);
		}
		socket.emit('delete:torrent', {"ids": arrayId, "removeLocalData": local});
	};

	$scope.torrentRename = function(data, id){
		RequestHandler.put(api + "torrent/rename/" + id, {'newName': data})
			.then(function(result){

			});
		console.log(id);
	};

	$scope.sendTorrentUrl = function(){
		socket.emit('post:torrent:url', {"url":$scope.newTorrentUrl, "id": $rootScope.user._id});
	};

	$scope.torrentStop = function(arrayId){
		if (!arrayId.length){
			arrayId = Tools.getElementForMatchValue($scope.torrents, "id", "checkbox", true);
		}
		RequestHandler.post(api + "torrent/action/stop", {ids: arrayId});
	};

	$scope.torrentStart = function(arrayId){
		if (!arrayId.length){
			arrayId = Tools.getElementForMatchValue($scope.torrents, "id", "checkbox", true);
		}
		RequestHandler.post(api + "torrent/action/start", {ids: arrayId});
	};

	$scope.FileConvertSize = function (aSize){
		return Tools.FileConvertSize(aSize);
	};

	$scope.checkboxSwitch = function(id){
		var index = $scope.itemSelected.indexOf(id);
		if (index >=0){
			$scope.itemSelected.splice(index, 1);
		}else{
			$scope.itemSelected.push(id);
		}

		console.log($scope.itemSelected);
	};

	$scope.selectAll = function(){
		console.log($scope.checkboxAll);
		if ($scope.checkboxAll){
			Tools.setAllItems($scope.torrents, "checkbox", true);
		}else{
			Tools.setAllItems($scope.torrents, "checkbox", false);
		}
	};

	//------------------------------------------------  CLICK RIGHT -------------------------------------------------------
	$scope.menuOptions = [
	    ['Delete local', function ($itemScope) {
			$scope.torrentRemove([$itemScope.torrent.id], true);
	    }],
	    ['Delete torrent', function ($itemScope) {
	        $scope.torrentRemove([$itemScope.torrent.id], false)
	    }]
	];

	//------------------------------------------------  DRAG & DROP-------------------------------------------------------

	$scope.$watch('files', function () {
        $scope.upload($scope.files);
    });
    $scope.$watch('file', function () {
        if ($scope.file != null) {
            $scope.files = [$scope.file];
        }
    });
    $scope.log = '';

    $scope.upload = function (files) {
        if (files && files.length) {
            for (var i = 0; i < files.length; i++) {
              var file = files[i];
              if (!file.$error) {
                Upload.upload({
                    url: '/torrent/add-torrents',
                    data: {
                      username: $scope.username,
                      torrent: file
                    }
                }).progress(function (evt) {
                    var progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
                    $scope.log = 'progress: ' + progressPercentage + '% ' + evt.config.data.file.name + '\n' + $scope.log;
                }).success(function (data, status, headers, config) {
					if (!data[0].success){
						$rootScope.msgInfo("Error !", "L'ajout du nouveau torrent a echoue...");
					}
                }).error(function (data, status, headers, config) {
					$rootScope.msgInfo("Error !", "L'ajout du nouveau torrent a echoue...");
				});
              }
            }
        }
    };

});