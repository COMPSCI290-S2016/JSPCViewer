import os

if __name__ == '__main__':
    color = [0.8, 0, 0]
    files = os.listdir('.')
    for filename in files:
        if not (filename[-3:] == "pts"):
            continue
        print filename
        fin = open(filename)
        lines = fin.readlines()
        fin.close()
        fout = open(filename, 'w')
        for l in lines:
            l = l.split()
            if len(l) == 0:
                continue
            l[3:] = color
            fout.write(("%s "*(len(l)-1)+"%s")%tuple(l))
            fout.write("\n")
        fout.close()
