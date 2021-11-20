function addImage() {
	document.getElementById("viewImage").src = window.URL.createObjectURL(document.getElementById("imageUpload").files[0]);
    $(".metaDiv").css("display", "block")
}

$(".openPhotoMeta").on("click", function(){
    if ($(window).width() < 1145) {
		$("html,body").scrollTop(0);	}
    var i = $(this).attr("id");
    $(".idForm").attr("value", $(".hID" + i).attr("value"));
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