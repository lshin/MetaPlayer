(function(document){
    /*! (C) WebReflection - Mit Style License */
    for (var
        script = document.getElementsByTagName("script"),
        o = {value:1},
        i = script.length,
        src;
        i--;
    ) {
        if (/(?:^|\/)VBClass\.loader\.js$/.test(src = script[i].src)) {
            i = 0;
            src = src.slice(0, -9);
            try {
                if (!Object.defineProperty(o,"_",o)._)throw "";
            } catch(e) {
                src += o.__defineGetter__ ? "define." : "IE.";
            }
        }
        document.write('<script type="text/javascript" src="' + src + 'js"></script>');
    }
}(document));