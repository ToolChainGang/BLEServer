#!/bin/bash
#
########################################################################################################################
########################################################################################################################
##
##      Copyright (C) 2020 Peter Walsh, Milford, NH 03055
##      All Rights Reserved under the MIT license as outlined below.
##
##  FILE
##      04-UpgradePerl.sh
##
##  DESCRIPTION
##      Do all the CPAN installs needed for perl programs
##
##      Mostly a lot of CPAN library installs
##
##  USAGE
##      04-UpgradeInstall.sh
##
##      1) Run this file (as root)
##
########################################################################################################################
########################################################################################################################

PATH="$PATH:../bin"

########################################################################################################################
########################################################################################################################
#
# Ensure we're being run as root
#
if ! IAmRoot; then
    echo
    echo "Must be run as root" 
    echo
    exit 1
    fi

########################################################################################################################
########################################################################################################################
#
# Ensure that the disk has been expanded
#
if ! DiskExpanded; then
    echo "============>Disk is not expanded, automatically expanding with reboot..."
    echo
    raspi-config --expand-rootfs
    reboot
    exit
    fi

########################################################################################################################
########################################################################################################################
#
# Packages
#
echo "===================================="
echo "Installing perl packages"

#
# Set the CPAN defaults we need
#
# cpan> o conf prerequisites_policy 'follow'
# cpan> o conf build_requires_install_policy yes
# cpan> o conf commit
#
perl -MCPAN -e 'my $c = "CPAN::HandleConfig"; $c->load(doit => 1, autoconfig => 1); $c->edit(prerequisites_policy => "follow"); $c->edit(build_requires_install_policy => "yes"); $c->commit'

cpan Archive::Tar
cpan Carp
cpan Carp::Heavy
cpan Compress::Zlib
cpan CPAN::Meta
cpan CPAN::Meta::Requirements
cpan CPAN::Meta::YAML
cpan Cwd
cpan Data::Dumper
cpan Digest::MD5
cpan Digest::SHA
cpan Encode
cpan Exporter
cpan ExtUtils::CBuilder
cpan ExtUtils::MakeMaker
cpan Fcntl
cpan File::Basename
cpan File::Compare
cpan FileHandle
cpan File::Path
cpan File::Slurp
cpan File::Spec
cpan File::Temp
cpan HTTP::Tiny
cpan IO::Compress::Base
cpan IO::Handle
cpan IO::Seekable
cpan IO::Zlib
cpan JSON
cpan JSON::PP
cpan Log::Log4perl
cpan MIME::Base64
cpan Module::Runtime
cpan Module::Signature
cpan Net::FTP
cpan Net::Ping
cpan Net::WebSocket::Server
cpan Parse::CPAN::Meta
cpan Pod::Coverage
cpan Pod::Perldoc
cpan Scalar::Util
cpan Socket
cpan Sub::Name
cpan Symbol
cpan Term::ReadLine::Gnu
cpan Test::Pod
cpan Test::Pod::Coverage
cpan Test::Harness
cpan Test::More
cpan Text::ParseWords
cpan Text::Wrap
cpan YAML

echo "Done."
echo

########################################################################################################################
#
# All done - Tell the user to reboot
#
echo "========================="
echo
echo "Done with installation, reboot for changes to take effect."
echo
