import os

if __name__ == '__main__':
    files = ["chris.pts"]
    for filename in files:
        print filename
        fin = open(filename)
        lines = fin.readlines()
        fin.close()
        fout = open(filename, 'w')
        for l in lines:
            l = l.split()
            if len(l) == 0:
                continue
            for k in range(3, 6):
                l[k] = float(l[k])/255.0
            l = l[0:6]
            fout.write(("%s "*(len(l)-1)+"%s")%tuple(l))
            fout.write("\n")
        fout.close()
