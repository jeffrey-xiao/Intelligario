# Intelligario

Intelligario is an Agario clone that uses computer algorithms to figure out where to go and what to kill. More interestingly, it allows human input through the live adjustment of an "aggression" factor, telling the AI if it should play it safe or blaze a path of glory.

Both the front end and back end are built off of JavaScript. Communication is accomplished between server and client through Socket.IO. Graphics are done through Fabric.JS (and ultimately HTML5 Canvas).

We used Dijkstra's algorithm to search the game board and determine the destination of each and every bubble. Ignoring the fact that JavaScript (a weakly typed language) is terrible for this, performance was less than satisfactory. Despite JavaScript's claim to fame as a non IO-Blocking event model, it is nonetheless single-threaded in 99% of cases and thus lags in the event of a long running script. Additionally, the JavaScript implementation of multi-threaded processing, JS Workers allowed us to run Dijkstra in the background while the animation proceeded smoothly in the foreground.

Devpost: https://devpost.com/software/intelligario
