//set starting topic to investigate and number of articles to scrape
var startingPoint = 'privacy',
    articlesNumber = 100;

//import dependencies
var fs = require('fs'),
    _ = require('underscore'),
    Nightmare = require('nightmare'),
    nightmare = Nightmare({
        // openDevTools: {
        //     mode: 'detach'
        // },
        // show: true
    });

//set dictionary, counters variables, tsv headers
var topics = [],
    articlesLinksList = [],
    loadedArticles = 0,
    scrolledHeight = 0,
    edgesHeader = 'source\ttarget\n',
    nodesHeader = 'id\n',
    articlesListHeader = 'ranking\ttitle\tauthor\tauthorBio\taffiliation\tlink\ttimestamp\trecommendsNumber\tresponsesNumber\ttags\n';

//get date and create new folder
var d = new Date(),
    date = d.toISOString(),
    newFolder = startingPoint + "_" + date.substring(0,10) + '(' + date.substring(11,13) + '-' + date.substring(14,16) + '-' + date.substring(17,19) + ')';

fs.mkdirSync(newFolder);
//start creating dictionary
topics.push(startingPoint);
//create edges tsv file
fs.writeFileSync(newFolder + '/' + startingPoint + '_edges.tsv', edgesHeader);
//create nodes tsv file and append the starting node
fs.writeFileSync(newFolder + '/' + startingPoint + '_nodes.tsv', nodesHeader);
fs.appendFileSync(newFolder + '/' + startingPoint + '_nodes.tsv', topics[0] + '\n');
//create articles list tsv file
fs.writeFileSync(newFolder + '/' + startingPoint + '_articlesList.tsv', articlesListHeader);

//functions that extract the info from each article's page
function extractInfo(counter) {
    console.log('retrieving info from article n. ' + (counter + 1) + '…');

    nightmare
        .goto(articlesLinksList[counter])
        .wait('footer')
        .evaluate(function(startingPoint) {
            //extract nodes from page when you cannot get the info right away otherwise go ahead and get that info
            var titleNode = document.querySelector('.postArticle-content .section-content h1'),
                title = (titleNode === null) ? 'none' : titleNode.innerText,

                author = document.querySelector('footer .js-cardUser h3 a').innerText,

                bioNode = document.querySelector('footer .js-cardUser p'),
                bio = (bioNode === null) ? 'none' : bioNode.innerText,

                blogNode = document.querySelector('footer .js-cardCollection h3 a'),
                blog = (blogNode === null) ? 'none' : blogNode.innerText,
                
                url = window.location.href,

                time = document.querySelector('header .postMetaLockup time').attributes[0].value,

                recommendsNode = document.querySelector('footer .postActions .u-floatLeft button[data-action="show-recommends"]'),
                recommends = (recommendsNode === null) ? 0 : recommendsNode.innerText,

                responsesNode = document.querySelector('footer .postActions .u-floatLeft button[data-action="scroll-to-responses"]').nextSibling,
                responses = (responsesNode === null) ? 0 : responsesNode.innerText,

                tagsNode = document.querySelectorAll('footer .tags .link'),
                tags = '';

            //get all the related tags ready for the network
            var tagsList = [];

            tagsNode.forEach(function(node, index, list) {
                if (node.innerText.toLowerCase() != startingPoint.toLowerCase()) {
                    if (index < (list.length - 1)) {
                        tags += node.innerText + '; ';
                    } else {
                        tags += node.innerText;
                    }
                    tagsList.push(node.innerText.toLowerCase());
                }
            });

            //create final Array that will be returned
            var finalArray = [{
                title: title,
                author: author,
                authorBio: bio,
                affiliation: blog,
                link: url,
                timestamp: time,
                recommendsNumber: recommends,
                responsesNumber: responses,
                tags: tags
            }, tagsList];

            return finalArray;
        }, startingPoint)
        .then(function(results) {
            console.log('Info retrieved.');

            //add article data to tsv
            var firstHalf = (counter + 1) + '\t' + results[0].title + '\t' + results[0].author + '\t' + results[0].authorBio + '\t' + results[0].affiliation + '\t',
                secondHalf = results[0].link + '\t' + results[0].timestamp + '\t' + results[0].recommendsNumber + '\t' + results[0].responsesNumber + '\t' + results[0].tags + '\n',
                newLine = firstHalf + secondHalf;

            fs.appendFileSync(newFolder + '/' + startingPoint + '_articlesList.tsv', newLine);

            //add tags to dictionary and to network
            _.each(results[1], function(element) {
                //check if the topic is already in the dictionary
                var match = _.indexOf(topics, element);
                if (match === -1) {
                    //if not add it and update the nodes tsv
                    topics.push(element);
                    fs.appendFileSync(newFolder + '/' + startingPoint + '_nodes.tsv', element + '\n');
                }
                //update edges tsv with new found connections
                var newEdgeLine = startingPoint + '\t' + element + '\n';
                fs.appendFileSync(newFolder + '/' + startingPoint + '_edges.tsv', newEdgeLine);
            });

            //repeat until all the articles have been scraped
            if (counter < (articlesLinksList.length - 1)) {
                extractInfo(counter + 1);
            } else {
                //close Electron
                nightmare
                    .evaluate()
                    .end()
                    .then();

                console.log('\nDone! Retrived all info from the ' + loadedArticles + ' articles related to ' + startingPoint);
            }
        });

}

//functions that retrieves all the articles
function getArticles() {
    //variable to check if the scroll doesn't load new articles
    var currentHeight = scrolledHeight;

    nightmare
        .scrollTo(scrolledHeight, 0)
        .wait(3000)
        .evaluate(function() {
            //check if the number of articles loaded are enough and get the height of the container for the next scroll if needed
            var linksNodeList = document.querySelectorAll('.streamItem .postArticle-readMore a'),
                listHeight = document.querySelector('.js-tagStream').offsetHeight,
                linksList = [];

            //push every link in to the list
            linksNodeList.forEach(function(node) {
                var link = node.href;
                linksList.push(link);
            })

            return {
                list: linksList,
                length: linksNodeList.length,
                height: listHeight
            };
        })
        .then(function(result) {
            console.log(result.length + '%');

            //update the number of articles loaded and the height of the articles' container
            loadedArticles = result.length;
            scrolledHeight = result.height;

            //scroll if there are not enough articles, otherwise call the extractInfo function
            if (loadedArticles < articlesNumber && currentHeight != scrolledHeight) {
                getArticles();
            } else {

                //pass the links array to the global variable so the next function can access it
                if (loadedArticles < articlesNumber) {
                    console.log('\nThe page didn\'t load more than ' + loadedArticles + ' articles. Some is better than nothing!');
                    articlesLinksList = result.list;
                } else {
                    console.log('\nAll ' + articlesNumber + ' articles collected.');
                    articlesLinksList = _.last(result.list, articlesNumber)
                }

                extractInfo(0);
            }
        });
}

//get the top articles related to the given word
console.log('retrieving articles from https://medium.com/tag/' + startingPoint + '…');

nightmare
    .goto('https://medium.com/tag/' + startingPoint)
    .wait();

getArticles();
