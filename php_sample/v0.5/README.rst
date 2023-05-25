===============================
PHP sample for SpeechAce API
===============================


*PHP sample for SpeechAce APIs.*

|

Installing
----------

|

Quick run PHP sample project
```````````````````````````````

|
| Using this instruction you can fast run PHP sample project locally

1. Clone the repository locally (e.g. using SourceTree or git command line tool)

2. Install `nodejs <https://nodejs.org/en/download/>`_ (the latest LTS version)

3. Use Terminal to go to the spacejs folder of the PHP_sample folder in repository

4. Go to folder 'src-js' and run the following command::

    npm install

5. Every time you want to compile the javascript run the following command from spacejs folder::

    npm run build-sample



|
| **Attention!** 
 
| **6. Choose your operating system**


6.1. Linux::

  install Apache 2:
     sudo apt-get install apache2sudo
     systemctl start apache2.service
     sudo systemctl enable apache2.service

  install php 7.0
     apt-cache pkgnames | grep php7.0
     sudo apt-get install -y php7.0 libapache2-mod-php7.0 php7.0-cli php7.0-common php7.0-mbstring php7.0-gd php7.0-intl php7.0-xml php7.0-mysql php7.0-mcrypt php7.0-zip
 
 Put php sample into /var/www/html

6.1. Windows::

  Download and install WAMP-server http://www.wampserver.com
  Put php sample into C:\\wamp\\www or C:\\wamp64\\www , open browser and go to http://localhost/php_sample

6.1. MAC::

  Enable Apache:
     apachectl start
  Then:
     sudo nano /etc/apache2/httpd.conf
  Find

  #LoadModule php7_module libexec/apache2/libphp7.so
     Delete # from the line above
  Restart apache:
     sudo apachectl restart


**UPDATE key:** Set apikey and includeFluency parameters in /src-php/SpeechacePhp/GetData.php

**SSL:** For properly working of Voice Recorder you need to install a SSL sertificate for your domain

