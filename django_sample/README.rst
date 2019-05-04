===============================
Django sample for SpeechAce API
===============================


*This project is a Django sample for SpeechAce APIs.*

|


Installing
----------

|

Quick run Django sample project
```````````````````````````````

|
| Using this instruction you can fast run Django sample project locally

1. Clone the repository locally (e.g. using SourceTree or git command line tool)

2. Install `nodejs <https://nodejs.org/en/download/>`_ (the latest LTS version)

3. Go to the spacejs folder of the django_sample folder in repository::

   cd spacejs

4. Run the following command::

    npm install

5. Every time you want to compile the javascript run the following command from spacejs folder::

    npm run build-sample

6. Download `anaconda python environment <https://www.anaconda.com/download>`_. (Pick the latest Python 3+ version). Install the package

7. Open a new Terminal window/tab (existing one may not have environment update). Create a python virtual environment by running the following commands in the new Terminal window/tab::

    conda create -n django_sample pip

8. Activate virtual environment::

    activate django_sample

9. Go to project directory::

    cd <speechace-api-samples repository/django_sample directory>

10. Install requirement python packages::

     pip install -r requirements/local.txt

11. Specify Scorer settings param SPEECHACE_API_KEY in core/settings.py

12. If you have purchased the SpeechAce PRO plan then specify SPEECHACE_INCLUDE_FLUENCY as 1 in core/settings.py for IELTS/PTE scores and other fluency metrics.

13. Collect static (you need to do it each time after compile the javascript)::

     python manage.py collectstatic

14. Run server::

     python manage.py runserver


|

.. warning:: This example uses HTML5 for recording and therefore if you are not hosting the sample on localhost then you must use SSL to activate the recorder properly.

|

Score API
---------

Base class Scorer::

    from api.core.score import Scorer


Takes three arguments:
    * Api key - token to identify user, e.g. hJk56Sa4...Tr421M
    * Api user id - user name, e.g. ielts
    * Api include fluency - set to 1 for the IELTS/PTE score and other fluency metrics. Only available with API PRO offer

Example::

    scorer = Scorer(api_key='hJk56Sa4...Tr421M', api_user_id='ielts')

|

Methods of SpeechACE APIs
`````````````````````````

1. Scoring text speech takes three arguments:
    * text - text of user speech
    * audio_data - user speech record
    * tokenized - default 0

Example::

    scorer.score_text_speech('sample text', audio_file, 0)

