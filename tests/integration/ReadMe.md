

## Read Me: Integration Tests

The tests in the `/tests/integration` folder are a collection of mostly manual test setups. In general, they are backed by models in Epicenter; while the models are included here, you'll need an Epicenter login to put the models on Epicenter and run these tests. (This also makes them different from the tests in the `/tests/specs` folder, which primarily compare Flow.js URIs to URIs required by Epicenter.js or Epicenter APIs, rather than doing a full round-trip with a model interaction.)

To run any of these integration tests (manually),

* Confirm that the model is on Epicenter in the project indicated by the test.
* Start up a local server (e.g. `python -m SimpleHTTPServer`) from the top-level `flow.js` folder.
* Go to `local.forio.com:8000/tests/integration/<your desired integration test>` and start playing with the UI.

The Julia integration tests also include some Selenium automation. To run the Selenium test suite:

* Confirm that the model is on Epicenter in the project indicated by the test.
* Start Firefox.
	* Install Selenium IDE Add-on for Firefox (we used [Selenium IDE 2.9.1](https://addons.mozilla.org/en-US/firefox/addon/selenium-ide/)).
* From Firefox, open the Selenium Add-on (during installation, will likely have been added as a button to your Firefox toolbar).
* With the Selenium window open, choose **File > Open Test Suite...**.
* Select the Test Suite at `/tests/integration/julia/General-Regression-Julia`.
* Choose to run any of the test cases, or the entire test suite. The suite automates typical actions used in regression testing based on the `/tests/integration/julia/sandbox-mj.html` page.



