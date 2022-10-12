# Dokku Configuration

Our Digital Ocean droplet has dokku configured with 2 apps:

```bash
root@aldea-zero-1:~$ dokku apps:list
=====> My Apps
demos
explorer
node
```

On the server, each of these has been configured to use a specific dockerfile in this directory:

```bash
root@aldea-zero-1:~$ dokku builder-dockerfile:set demos dockerfile-path dokku/demos.dockerfile
=====> Setting dockerfile-path to dokku/demos.dockerfile~
```

To deploy a new version, commit all of your changes and then run the `deploy.sh` script in the project directory you wish to deploy.
