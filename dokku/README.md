# Dokku Configuration

Our Digital Ocean droplet has dokku configured various apps:

```bash
root@aldea-zero-1:~$ dokku apps:list
=====> My Apps
demos
explorer
node
rustdocs
```

On the server, each of these has been configured to use a specific dockerfile in this directory:

```bash
root@aldea-zero-1:~$ dokku builder-dockerfile:set demos dockerfile-path dokku/demos/Dockerfile
=====> Setting dockerfile-path to dokku/demos/Dockerfile~
```

To deploy a new version, commit all of your changes and then run the `deploy.sh` script in one of the included directories you wish to deploy.
