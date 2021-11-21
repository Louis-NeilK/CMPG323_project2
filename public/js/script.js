function addImage() {
	document.getElementById("viewImage").src = window.URL.createObjectURL(document.getElementById("imageUpload").files[0]);
    $(".metaDiv").css("display", "block")
}

$(".openPhotoMeta").on("click", function(){
    if ($(window).width() < 1145) {
		$("html,body").scrollTop(0);	}
    var i = $(this).attr("id");
    $(".siteForm").attr("value", "my");
    $(".idForm").attr("value", $(".hID" + i).attr("value"));
    $("#downloadForm").attr("href", $(".hLink" + i).attr("value"));
    $("#downloadForm").attr("download", $(".hName" + i).attr("value"));
    $("#nameForm").attr("value", $(".hName" + i).attr("value"));
    $("#locationForm").attr("value", $(".hLocation" + i).attr("value"));
    $("#tagsForm").attr("value", $(".hTags" + i).attr("value"));
    $("#accessForm").attr("value", $(".hAccess" + i).attr("value"));
    $("#dateForm").attr("value", $(".hDate" + i).attr("value"));
    $("#creatorForm").attr("value", $(".hCreator" + i).attr("value"));
    $(".editMetaDiv").css("display", "flex");
})

$(".btnCloseMetaDiv").on("click", function(){
    $(".editMetaDiv").css("display", "none");
})

$(".btnDeletePic").on("click", function(){
    $(".deletePicDiv").css("display", "flex");
})

$(".btnCloseDelete").on("click", function(){
    $(".deletePicDiv").css("display", "none");
})

$(".btnSharePic").on("click", function(){
    $(".sharePicDiv").css("display", "flex");
})

$(".btnCloseShare").on("click", function(){
    $(".sharePicDiv").css("display", "none");
})

$(".btnCloseInfoDelete").on("click", function(){
    $(".infoDeletedDiv").css("display", "none");
})

$(".btnCloseInfoShared").on("click", function(){
    $(".infoSharedDiv").css("display", "none");
})

$(".btnCloseInfoErrorShared").on("click", function(){
    $(".infoSharedErrorDiv").css("display", "none");
})

$(".btnCloseAccess").on("click", function(){
    $(".infoAccessDiv").css("display", "none");
})

$(".btnCloseReqAccess").on("click", function(){
    $(".requestAccessDiv").css("display", "none");
})

$(".btnCloseErrorType").on("click", function(){
    $(".errorTypeDiv").css("display", "none");
})

$(".openReqAccess").on("click", function(){
    var i = $(this).attr("id");
    $(".reqIDForm").attr("value", i);
    $(".requestAccessDiv").css("display", "flex");
})

$(".openSharedMeta").on("click", function(){
    if ($(window).width() < 1145) {
		$("html,body").scrollTop(0);	}
    var i = $(this).attr("id");
    $(".siteForm").attr("value", "share");
    $(".idForm").attr("value", $(".sID" + i).attr("value"));
    $("#downloadForm").attr("href", $(".sLink" + i).attr("value"));
    $("#downloadForm").attr("download", $(".sName" + i).attr("value"));
    $("#nameForm").attr("value", $(".sName" + i).attr("value"));
    $("#locationForm").attr("value", $(".sLocation" + i).attr("value"));
    $("#tagsForm").attr("value", $(".sTags" + i).attr("value"));
    $("#accessForm").attr("value", $(".sAccess" + i).attr("value"));
    $("#dateForm").attr("value", $(".sDate" + i).attr("value"));
    $("#creatorForm").attr("value", $(".sCreator" + i).attr("value"));
    $(".btnSharePic").css("display", "none")
    $(".editMetaDiv").css("display", "flex");
})