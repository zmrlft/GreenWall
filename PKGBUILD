# Maintainer: Jeremy Zhao <ggajy123@gmail.com>
# Contributor: zmrlft <2643895326@qq.com>

pkgname='green-wall-git'
pkgver=v0.2.0.r2.g6496e86
pkgrel=1
pkgdesc="A tool for educational/research purposes related to GitHub contribution mechanics."
arch=('x86_64')
url="https://github.com/zmrlft/GreenWall"
license=('CUSTOM')
depends=('gtk3' 'webkit2gtk')
makedepends=('go' 'npm' 'wails' 'git')
conflicts=('green-wall')
source=("$pkgname::git+$url.git")
sha256sums=('SKIP')

pkgver() {
  cd "$srcdir/$pkgname"
  git describe --long --tags --abbrev=7 | sed 's/\([^-]*-g\)/r\1/;s/-/./g'
}

build() {
  cd "$srcdir/$pkgname"

  go mod tidy

  wails build -o "green-wall"
}

package() {
  cd "$srcdir/$pkgname"

  install -Dm755 "build/bin/green-wall" "$pkgdir/usr/bin/green-wall"
  install -Dm644 "build/appicon.png" "$pkgdir/usr/share/pixmaps/$pkgname.png"

  install -Dm644 /dev/stdin "$pkgdir/usr/share/applications/$pkgname.desktop" << EOF
[Desktop Entry]
Name=Green Wall
Comment=$pkgdesc
Exec=green-wall
Terminal=false
Type=Application
Icon=$pkgname.png
Categories=Utility;Development;
EOF
}
