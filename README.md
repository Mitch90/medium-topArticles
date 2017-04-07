# medium-topArticles
Node script that retrieves the top articles related to an issue on Medium and outputs a network of keywords

###To run medium-topArticles:

* Make sure you have [Node](https://nodejs.org/en/) installed

* Clone the repository

* Go to the medium-topArticles folder
```
cd pathToTheMedium-topArticlesFolder
```

* Install node modules
```
npm install
```

* Open **index.js** and choose the topic to analyze and the number of articles to retrieve
```javascript
var startingPoint = 'privacy',
    articlesNumber = 100;
```

* Run the script
```
node index.js
```
