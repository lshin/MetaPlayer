(function () {

    var $ = jQuery;

    var defaults = {
        delayMsec : 1000
    };

    var Sample = function  (options) {
        if( !(this instanceof Sample) )
            return new Sample(options);
        this.config = $.extend(true, {}, defaults, options);
    };

    Ramp.Services.Sample = Sample;

    Ramp.sample = function (id, host, options) {
        return new Ramp.Models.Media({
            rampId : id,
            rampHost : host,
            service : new Sample(options)
        }, host);
    };

    Sample.prototype = {
        parse : function (string) {
            return Sample.data;
        },

        load : function ( mediaId, mediaHost, callback, scope) {
            setTimeout( function () {
                var data = $.extend(true, {}, Sample.mediaData);
                callback.call(scope, data);
            }, this.config.delayMsec);
        },

        search : function (term, callback, scope) {
            if( ! this.data )
                throw "media not loaded";

            setTimeout( function () {
                var data = $.extend(true, {}, Sample.searchData);
                callback.call(scope, data);
            }, this.config.delayMsec);
        }
    };

    Sample.mediaData = {
        metadata : {
            title : "Euro Contagion Risks Loom in Corporate Credit Market ",
            description: "Fundamentals remain strong across the board, but high-quality corporate credits are likely to outperform in a volatile environment, says Morningstar's Dave Sekera.",
            thumbnail : "http://publishing.ramp.com/thumbnails/cached_media/0006/0006401/0006401014/images/thumb.jpg",
            poster : "http://publishing.ramp.com/thumbnails/cached_media/0006/0006401/0006401014/images/thumb.jpg"
        },
        "transcodes" : [
            {
                "name" : "default",
                "type" : "video/mp4",
                "url"  : "http://videos.mozilla.org/serv/webmademovies/wtfpopcorn.mp4"
            },
            {
                "name" : "some.name",
                "type" : "video/webm",
                "url"  : "http://videos.mozilla.org/serv/webmademovies/wtfpopcorn.webm"
            },
            {
                "name" : "some.name",
                "type" : "video/ogg",
                "url"  : "http://videos.mozilla.org/serv/webmademovies/wtfpopcorn.ogv"
            }
        ],
        tags : [
            {
                term : "United States",
                type : "place",
                score : 19.390835,
                origin : "namedentity",
                timestamps : [ 44.449, 170.339, 196.689, 217.504 ]
            },
            {
                term : "Morningstar",
                type : "company",
                score : 4.843158,
                origin : "namedentity",
                timestamps : [ 8.209, 498.966 ]
            },
            {
                term : "Spain",
                type : "place",
                score : 3.7033582,
                origin : "namedentity",
                timestamps : [ 283.749, 300.219 ]
            },                    {
                term : "private equity",
                type : "unk",
                score : 3.6826441,
                origin : "namedentity",
                timestamps : [ 89.619 ]
            }
        ],
        captions : [
            {
                start : 0,
                text : "Jeremy Glaser : For Morningstar, I'm Jeremy Glaser. I'm here"
            },
            {
                start : 10.29,
                text : "today with our bond strategist, Dave Sekera, to get an "
            },
            {
                start : 12.30,
                text : "update on the corporate credit market , and on what investors"
            },
            {
                start : 14.69,
                text : ""
            }
            // <smilText>Jeremy Glaser : For Morningstar, I'm Jeremy Glaser. I'm here <clear begin="10.29s"/>today with our bond strategist, Dave Sekera, to get an <clear begin="12.30s"/>update on the corporate credit market , and on what investors <clear begin="14.69s"/>could expect going forward. Dave, thanks for joining me today. <clear begin="16.84s"/>Dave Sekera : You are welcome, Jeremy. Good to be <clear begin="18.35s"/>here. Glaser : So let's start talking a little bit <clear begin="19.99s"/>about corporate fundamentals, before we get to some of the <clear begin="22.75s"/>macro issues, that I know are on a lot of <clear begin="24.33s"/>people's minds. What's really happening in the corporate marketplace? Are <clear begin="28.77s"/>balance sheets still remaining strong, even as the economy kind <clear begin="32.03s"/>of weakened a little bit this summer? Sekera : As <clear begin="34.22s"/>you mentioned, it has been a crazy time in all <clear begin="36.28s"/>of the asset markets, including the corporate bond market . But <clear begin="40.01s"/>you know, getting back to just the underlying fundamentals of <clear begin="43.34s"/>corporate credit here in the United States , fundamentally, we are <clear begin="46.58s"/>still looking pretty good. Third-quarter earnings reports that came out <clear begin="50.28s"/>generally were either in line or better than expected. It <clear begin="53.24s"/>has been positive for bondholders, looking at probability of default <clear begin="58.78s"/>risk across the universe of names that we cover. Things <clear begin="62.88s"/>still are pretty even; are still even maybe looking a <clear begin="65.51s"/>tad better. Glaser : So I know in the past, <clear begin="68.00s"/>you have talked about self-inflicted credit wounds. Companies either doing <clear begin="72.31s"/>a debt-fueled buyback or M&amp;A activity or an LBO or <clear begin="75.73s"/>something something like that. Is that a trend that you <clear begin="78.20s"/>have seen kind of play out this year, or do <clear begin="79.83s"/>you think that companies are still being pretty prudent about <clear begin="82.33s"/>their cash management? Sekera : Of those three, we didn't <clear begin="85.01s"/>see the LBOs that we expected this year, we missed <clear begin="87.70s"/>that one. We thought there was going to be a <clear begin="89.23s"/>lot more private equity activity out there. Debt-fueled LBOs, where <clear begin="93.95s"/>we'd see companies get taken out and levered up. It <clear begin="96.63s"/>just really did not occur. There were definitely some instances, <clear begin="98.72s"/>but we thought it was going to be much greater <clear begin="100.63s"/>than it actually was. However, we have seen a lot <clear begin="103.59s"/>more share buybacks, where companies are issuing debt, using that <clear begin="107.70s"/>debt in order to buy back the stock, which, of <clear begin="109.65s"/>course, is usually negative for bondholders. Having said that--of the <clear begin="113.26s"/>names that we follow, the buybacks that they have done, <clear begin="116.63s"/>the debt that they have issued, has been within the <clear begin="119.51s"/>rating category. So there have really only been a couple <clear begin="121.84s"/>of instances where we've downgraded any of the companies that <clear begin="124.50s"/>we cover because of that share buyback activity. Glaser : <clear begin="127.86s"/>Now you mentioned third-quarter earnings were reasonably in line or <clear begin="131.09s"/>a little bit stronger. But they were really kind of <clear begin="133.14s"/>overshadowed in a lot of ways by the crisis in <clear begin="135.73s"/>Europe. What impact do you think that the sovereign debt <clear begin="139.07s"/>situation there is having on corporate credits in the U.S. <clear begin="141.97s"/>and elsewhere? Sekera : Well, it has definitely been a <clear begin="144.62s"/>rollercoaster. Going back to May of 2010, when you and <clear begin="147.36s"/>I first started talking about the sovereign debt crisis, we <clear begin="151.87s"/>did write and opined at that point in time that <clear begin="153.58s"/>we recommended that investors stick with U.S. corporate bonds as <clear begin="157.39s"/>opposed to European corporate bonds, and we still hold that <clear begin="160.25s"/>view today. Now there are instances where we are starting <clear begin="162.81s"/>to see some European bonds for the same corporate credit <clear begin="165.99s"/>risks that are trading at a higher yield or a <clear begin="168.70s"/>wider spread than what we are seeing in the United <clear begin="170.71s"/>States . But it's not yet to the point where we <clear begin="172.73s"/>are willing to make that call, to go ahead and <clear begin="175.27s"/>buy the euro-denominated issues, even if you can swap that <clear begin="178.54s"/>back into U.S. dollars. There is just still too much <clear begin="181.81s"/>fundamental or really systemic risk of what could happen in <clear begin="186.06s"/>Europe right now. Having said that, in the U.S., PPI/CPI <clear begin="191.09s"/>that came out this week, both of those numbers are <clear begin="193.35s"/>still showing inflation is well under control here in the <clear begin="196.69s"/>United States . Looking at what we call the five-year, five-year <clear begin="201.44s"/>forward, which is inflation expectation, stripping out inflation from the <clear begin="205.50s"/>TIPS and straight bonds, still within that trading range that <clear begin="208.96s"/>we have seen--kind of that 2% to 2.5% for quite <clear begin="211.62s"/>a while now. So, we're really not worried about inflation <clear begin="214.97s"/>at this point. We're not worried about the United States <clear begin="218.11s"/>as much as we are the contagion effect of what <clear begin="220.09s"/>could happen in Europe. Glaser : So, some of those <clear begin="222.15s"/>contagion effects into the U.S. credits, do you think that <clear begin="225.58s"/>would come from a weakening of those corporate fundamentals? Would <clear begin="228.38s"/>it come from people kind of rushing money into different <clear begin="231.61s"/>parts of the bond market that maybe don't expect to <clear begin="233.74s"/>get that money? How exactly would that contagion work? Sekera <clear begin="236.37s"/>: Well, it depends on how that contagion first starts. <clear begin="238.82s"/>So, what we've been seeing and our bank credit analyst <clear begin="241.65s"/>Jim Leonard put out a note earlier this week mentioning <clear begin="245.31s"/>that it looks like they're having some liquidity and some <clear begin="247.26s"/>funding issues with the Italian banks this week--that the Italian <clear begin="250.53s"/>banks have gone to the ECB, asking that ECB to <clear begin="255.01s"/>free up some of the collateral guidelines, so that they <clear begin="257.30s"/>can take some of their assets, pledge that to the <clear begin="259.33s"/>ECB to get additional funding. So it depends if we're <clear begin="263.04s"/>looking at a liquidity crisis coming from the banks, or <clear begin="266.06s"/>if it's really more of a solvency crisis coming from <clear begin="269.11s"/>the nations themselves. So this week, we have been seeing <clear begin="272.56s"/>the ECB trying to defend where the interest rates have <clear begin="275.54s"/>been for Italy. Spain's bonds have been weakening pretty dramatically <clear begin="280.31s"/>as well. It looks like they have been intervening in <clear begin="282.52s"/>that market. Spain issued some new 10-year notes, just inside <clear begin="287.29s"/>7% last night, and 7% on the 10-year has kind <clear begin="290.46s"/>of been this litmus test that we have seen in <clear begin="292.39s"/>the market, where tighter than 7% as long as the <clear begin="295.93s"/>dynamics of the country look like they could be fixed <clear begin="298.31s"/>over time, i.e., Italy and Spain, if it's inside 7%, <clear begin="303.19s"/>they can probably work it out. But if all of <clear begin="305.03s"/>a sudden we start getting wider than 7%, now people <clear begin="307.90s"/>are starting to question whether or not those countries would <clear begin="310.05s"/>essentially go into a debt spiral, because the interest expense <clear begin="313.26s"/>that they have to pay on the debt that they <clear begin="315.34s"/>need to issue to fund their deficit, as well as <clear begin="317.38s"/>the debt that they need to issue to roll existing <clear begin="319.70s"/>debt as it comes due, becomes such that the interest <clear begin="322.68s"/>expense becomes more and greater, faster than what they'd ever <clear begin="326.80s"/>be able to grow out of with additional GDP. Glaser <clear begin="329.14s"/>: So does it concern you that even after the <clear begin="332.01s"/>installation of these new technocratic governments in Greece and in <clear begin="334.63s"/>Italy, that those spreads remain so elevated through this week? <clear begin="338.14s"/>Sekera : Yes, and essentially what we've seen is the <clear begin="340.18s"/>market keeps going back and keeps testing the ECB to <clear begin="342.97s"/>see if the ECB's resolve is really there. So, for <clear begin="346.61s"/>example, with that Spanish bond issue that was just auctioned, <clear begin="348.80s"/>it was auctioned I think at  6.98%. After it was <clear begin="353.38s"/>auctioned, it rallied maybe a good 40 basis points, but <clear begin="356.79s"/>then throughout the rest of the day we kept seeing <clear begin="358.97s"/>it weaken and weaken further until it got back to <clear begin="361.59s"/>that 7%; by the end of the day it looked <clear begin="363.91s"/>like it traded maybe just inside that 7%. Same with <clear begin="367.22s"/>the Italian 10-year bonds; we initially saw that blow way <clear begin="370.35s"/>through 7% up to 7.4%, it came back in to <clear begin="374.34s"/>maybe the six-handle area before it widened back out and <clear begin="377.63s"/>then came back in again. So, the ECB is definitely <clear begin="380.36s"/>out there. Well, in my opinion, from what I have <clear begin="382.59s"/>heard, it appears that the ECB is in there trying <clear begin="385.43s"/>to defend those markets, trying to keep them inside that <clear begin="388.06s"/>7%, trying to make sure that there is enough room <clear begin="392.07s"/>that the technocrats, as you want to call it, will <clear begin="395.29s"/>have the ability to come in, put in structural reforms, <clear begin="398.66s"/>put in some austerity measures , really be able to come <clear begin="403.00s"/>in with a couple of different avenues to try and <clear begin="405.60s"/>bring their finances under control. But they need enough time <clear begin="408.51s"/>to do that, which is part of what the EFSF <clear begin="411.71s"/>was originally supposed to do, was to be able to <clear begin="414.40s"/>go out and buy bonds in the secondary market. Part <clear begin="418.94s"/>of the latest package was that they were going to <clear begin="420.73s"/>try and lever that up so that you could use <clear begin="422.70s"/>that in order to bridge and backstop sovereign debt issuance <clear begin="426.06s"/>as well as then try and recapitalize the banks if <clear begin="428.41s"/>the European banks couldn't recapitalize in the secondary market. We're <clear begin="432.53s"/>still waiting to see details on that plan. So, I <clear begin="434.89s"/>am still skeptical that that plan really comes through at <clear begin="437.81s"/>the end of the day. Glaser : So, given all <clear begin="439.49s"/>of this, for investors who may want to be buying <clear begin="441.82s"/>U.S. corporates now, are there certain areas of maturity that <clear begin="445.37s"/>look more attractive or certain sectors that look more attractive <clear begin="448.09s"/>than others? Where would be a good place to put <clear begin="450.02s"/>money to work? Sekera : On the curve, probably the <clear begin="452.60s"/>seven-year duration is probably the most attractive to us at <clear begin="455.82s"/>this point. It's where you get the greatest pickup on <clear begin="458.28s"/>the yield curve without going too far out on the <clear begin="460.53s"/>yield curve. The high-quality names definitely look good. Single-A or <clear begin="465.29s"/>better is probably a good spot to be in right <clear begin="467.59s"/>now. It gives you additional yield pickup. You can probably <clear begin="470.06s"/>pick up 150 basis points to 200 basis points over <clear begin="473.77s"/>Treasuries. But it's still a very high-quality name, and even <clear begin="477.37s"/>in a downturn, you should have a lot less risk <clear begin="479.84s"/>in those single-As than the BBBs. The BBBs at the <clear begin="483.62s"/>250 to 300 range might look attractive, but those bonds <clear begin="488.77s"/>are going to be the ones that get hit the <clear begin="490.15s"/>hardest if we do see any kind of systemic risk <clear begin="493.12s"/>in the system coming out of Europe. Glaser : Well, <clear begin="495.31s"/>Dave, I really appreciate your insight today. Sekera : You're <clear begin="497.46s"/>welcome. Good to be here. Glaser : For Morningstar, I'm <clear begin="499.79s"/>Jeremy Glaser. </smilText>
        ],
        metaq : []
    };

    Sample.searchData = {
        query : "brown fox",
        results : [
            {
                start: 10,
                text :   [
                    {
                        start : 10,
                        text : "The"
                    },
                    {
                        start : 11,
                        text : "quick"
                    },
                    {
                        start : 12,
                        match : true,
                        text : "brown"
                    },
                    {
                        start : 13,
                        match : true,
                        text : "fox"
                    },
                    {
                        start : 14,
                        text : "jumps"
                    },
                    {
                        start : 15,
                        text : "over"
                    },
                    {
                        start : 16,
                        text : "the"
                    },
                    {
                        start : 17,
                        text : "lazy"
                    },
                    {
                        start : 18,
                        text : "dog"
                    }

                ]
            }
        ]
    };

})();