const str = '<meta content="0;url=/httpservice/retry/enablejs?sei=neUN" http-equiv="refresh">';
const res = str.replace(/(<meta\s+[^>]*?url=)([^;"'>]+)([^>]*>)/gi, (match, p1, p2, p3) => {
    return p1 + "REPLACED:" + encodeURIComponent(p2) + p3;
});
console.log(res);
