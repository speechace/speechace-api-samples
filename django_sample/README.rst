===============================
Django sample for SpeechAce API
===============================

*This project is a Django sample for SpeechAce APIs.*
|
Installing
----------
|

Quick Start for SpeechAce API Django sample project
```````````````````````````````````````````````````

|
| Using this instruction you can fast run Django sample project locally

1. Clone the repository locally (e.g. using SourceTree or git command line tool)

2. Install `nodejs <https://nodejs.org/en/download/>`_ (the latest LTS version)

3. Go to the spacejs folder of the django_sample folder in repository::

    cd speechace-api-samples/django_sample/spacejs

4. Run the following command::

    npm install

5. Every time you want to compile the javascript run the following command from spacejs folder::

    npm run build-sample

6. Download `anaconda python environment <https://www.anaconda.com/download>`_. (Pick the latest Python 3+ version). Install the package

7. Open a new Terminal window/tab (existing one may not have environment update). Create a python virtual environment by running the following commands in the new Terminal window/tab::

    conda create -n django_sample pip

8. Activate virtual environment::

    activate django_sample

9. Go to django_sample directory in repo::

    cd speechace-api-samples/django_sample

10. Install requirement python packages::

     pip install -r requirements/local.txt

11. Set SPEECHACE_API_KEY in core/settings.py. You can obtain a key by contacting the SpeechAce team at www.speechace.com

12. For getting fluency metrics and IELTS/PTE scores, specify SPEECHACE_INCLUDE_FLUENCY=1 in core/settings.py. This feature is only available with PRO plan purchase.

13. Collect static (you need to do it each time after compile the javascript)::

     python manage.py collectstatic

14. Run server::

     python manage.py runserver

15. This example uses HTML5 for recording and therefore you must HTTPS (SSL) while accessing the sample from non-localhost servers.

16. You can also try the sample at https://www.speechace.co/api_sample
